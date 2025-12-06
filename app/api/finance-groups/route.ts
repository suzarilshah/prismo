import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { financeGroups, financeGroupMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { notifyFinanceGroupCreated } from "@/lib/notification-service";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(["personal", "family", "business", "investment", "side_hustle"]).default("personal"),
  icon: z.string().optional(),
  color: z.string().optional(),
  currency: z.string().default("MYR"),
  isDefault: z.boolean().optional(),
});

// GET /api/finance-groups - Get all finance groups for user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get groups where user is owner or member
    const ownedGroups = await db
      .select()
      .from(financeGroups)
      .where(eq(financeGroups.ownerId, session.user.id))
      .orderBy(desc(financeGroups.isDefault), desc(financeGroups.lastActivityAt));

    // Get groups where user is a member (not owner)
    const memberships = await db
      .select({
        membership: financeGroupMembers,
        group: financeGroups,
      })
      .from(financeGroupMembers)
      .innerJoin(financeGroups, eq(financeGroupMembers.financeGroupId, financeGroups.id))
      .where(
        and(
          eq(financeGroupMembers.userId, session.user.id),
          eq(financeGroupMembers.status, "active")
        )
      );

    const memberGroups = memberships
      .filter((m) => m.group.ownerId !== session.user.id)
      .map((m) => ({
        ...m.group,
        membership: m.membership,
        isOwner: false,
      }));

    const groups = [
      ...ownedGroups.map((g) => ({ ...g, isOwner: true })),
      ...memberGroups,
    ];

    return NextResponse.json({
      success: true,
      data: groups,
      totalOwned: ownedGroups.length,
      totalMember: memberGroups.length,
    });
  } catch (error) {
    console.error("Error fetching finance groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance groups" },
      { status: 500 }
    );
  }
}

// POST /api/finance-groups - Create a new finance group
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSchema.parse(body);

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      await db
        .update(financeGroups)
        .set({ isDefault: false })
        .where(eq(financeGroups.ownerId, session.user.id));
    }

    // Create the finance group
    const [group] = await db
      .insert(financeGroups)
      .values({
        ownerId: session.user.id,
        ...validatedData,
      })
      .returning();

    // Add owner as a member with full permissions
    await db.insert(financeGroupMembers).values({
      financeGroupId: group.id,
      userId: session.user.id,
      role: "owner",
      relationship: "self",
      permissions: {
        viewTransactions: true,
        editTransactions: true,
        viewBudgets: true,
        editBudgets: true,
        viewGoals: true,
        editGoals: true,
        viewTax: true,
        editTax: true,
        viewCommitments: true,
        editCommitments: true,
        viewReports: true,
        exportData: true,
        inviteMembers: true,
        manageMembers: true,
      },
      status: "active",
    });

    // Create notification for new finance group
    await notifyFinanceGroupCreated(session.user.id, group.name, group.id);

    return NextResponse.json({
      success: true,
      data: group,
      message: "Finance group created",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating finance group:", error);
    return NextResponse.json(
      { error: "Failed to create finance group" },
      { status: 500 }
    );
  }
}
