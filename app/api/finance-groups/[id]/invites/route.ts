import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { financeGroups, financeGroupMembers, financeGroupInvites, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendEmail, emailTemplates } from "@/lib/email";

const inviteSchema = z.object({
  inviteeEmail: z.string().email(),
  inviteeName: z.string().optional(),
  proposedRole: z.enum(["admin", "editor", "viewer"]).default("viewer"),
  proposedRelationship: z.enum(["spouse", "family", "friend", "accountant", "auditor", "business_partner"]).optional(),
  message: z.string().optional(),
  permissions: z.object({
    viewTransactions: z.boolean().default(true),
    editTransactions: z.boolean().default(false),
    viewBudgets: z.boolean().default(true),
    editBudgets: z.boolean().default(false),
    viewGoals: z.boolean().default(true),
    editGoals: z.boolean().default(false),
    viewTax: z.boolean().default(false),
    editTax: z.boolean().default(false),
    viewCommitments: z.boolean().default(true),
    editCommitments: z.boolean().default(false),
    viewReports: z.boolean().default(true),
    exportData: z.boolean().default(false),
    inviteMembers: z.boolean().default(false),
    manageMembers: z.boolean().default(false),
  }).optional(),
});

// GET /api/finance-groups/[id]/invites - Get all invites for a finance group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: financeGroupId } = await params;

    // Verify user has permission to view invites
    const [membership] = await db
      .select()
      .from(financeGroupMembers)
      .where(
        and(
          eq(financeGroupMembers.financeGroupId, financeGroupId),
          eq(financeGroupMembers.userId, session.user.id)
        )
      );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const invites = await db
      .select({
        invite: financeGroupInvites,
        invitedBy: users,
      })
      .from(financeGroupInvites)
      .innerJoin(users, eq(financeGroupInvites.invitedByUserId, users.id))
      .where(eq(financeGroupInvites.financeGroupId, financeGroupId))
      .orderBy(desc(financeGroupInvites.createdAt));

    return NextResponse.json({
      success: true,
      data: invites.map((i) => ({
        ...i.invite,
        invitedBy: { name: i.invitedBy.name, email: i.invitedBy.email },
      })),
    });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// POST /api/finance-groups/[id]/invites - Create an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: financeGroupId } = await params;
    const body = await request.json();
    const validatedData = inviteSchema.parse(body);

    // Verify user has permission to invite
    const [membership] = await db
      .select()
      .from(financeGroupMembers)
      .where(
        and(
          eq(financeGroupMembers.financeGroupId, financeGroupId),
          eq(financeGroupMembers.userId, session.user.id)
        )
      );

    if (!membership || (membership.role !== "owner" && !membership.permissions?.inviteMembers)) {
      return NextResponse.json({ error: "Not authorized to invite members" }, { status: 403 });
    }

    // Check if invitee is already a member
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.inviteeEmail));

    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(financeGroupMembers)
        .where(
          and(
            eq(financeGroupMembers.financeGroupId, financeGroupId),
            eq(financeGroupMembers.userId, existingUser.id)
          )
        );

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this group" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const [existingInvite] = await db
      .select()
      .from(financeGroupInvites)
      .where(
        and(
          eq(financeGroupInvites.financeGroupId, financeGroupId),
          eq(financeGroupInvites.inviteeEmail, validatedData.inviteeEmail),
          eq(financeGroupInvites.status, "pending")
        )
      );

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invite already exists for this email" },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString("hex");

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invite
    const [invite] = await db
      .insert(financeGroupInvites)
      .values({
        financeGroupId,
        invitedByUserId: session.user.id,
        inviteeEmail: validatedData.inviteeEmail,
        inviteeName: validatedData.inviteeName,
        proposedRole: validatedData.proposedRole,
        proposedRelationship: validatedData.proposedRelationship,
        proposedPermissions: validatedData.permissions || {
          viewTransactions: true,
          editTransactions: false,
          viewBudgets: true,
          editBudgets: false,
          viewGoals: true,
          editGoals: false,
          viewTax: false,
          editTax: false,
          viewCommitments: true,
          editCommitments: false,
          viewReports: true,
          exportData: false,
          inviteMembers: false,
          manageMembers: false,
        },
        message: validatedData.message,
        inviteToken,
        expiresAt,
        status: "pending",
      })
      .returning();

    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${inviteToken}`;

    // Get inviter's name and group details
    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id));
    
    const [group] = await db
      .select({ name: financeGroups.name })
      .from(financeGroups)
      .where(eq(financeGroups.id, financeGroupId));

    // Send invitation email
    const emailContent = emailTemplates.financeGroupInvite({
      inviteeName: validatedData.inviteeName,
      inviterName: inviter?.name || "A Prismo user",
      groupName: group?.name || "Finance Group",
      role: validatedData.proposedRole,
      inviteLink,
      message: validatedData.message,
      expiresAt,
    });

    const emailResult = await sendEmail({
      to: validatedData.inviteeEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...invite,
        inviteLink,
        emailSent: emailResult.success,
      },
      message: emailResult.success 
        ? "Invitation sent successfully!" 
        : "Invite created but email could not be sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
