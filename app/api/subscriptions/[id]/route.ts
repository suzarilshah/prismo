import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";

const updateSubscriptionSchema = z.object({
  categoryId: z.string().uuid().optional().nullable().or(z.literal("")),
  name: z.string().min(1).max(255).optional(),
  amount: z.string().or(z.number()).optional(),
  currency: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  nextBillingDate: z.string().or(z.date()).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional().nullable(),
  isActive: z.boolean().optional(),
  reminderDays: z.number().optional(),
  notes: z.string().optional(),
  website: z.string().optional().or(z.literal("")),
  icon: z.string().optional(),
});

// GET /api/subscriptions/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const results = await db
      .select({
        subscription: subscriptions,
        category: categories,
      })
      .from(subscriptions)
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results[0].subscription,
        category: results[0].category,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// PATCH /api/subscriptions/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSubscriptionSchema.parse(body);

    // Build update object
    const updateData: Record<string, any> = { updatedAt: new Date() };
    
    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId === "" ? null : validatedData.categoryId;
    }
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.amount) updateData.amount = validatedData.amount.toString();
    if (validatedData.currency) updateData.currency = validatedData.currency;
    if (validatedData.frequency) updateData.frequency = validatedData.frequency;
    if (validatedData.nextBillingDate) updateData.nextBillingDate = new Date(validatedData.nextBillingDate);
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    }
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.reminderDays !== undefined) updateData.reminderDays = validatedData.reminderDays;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.website !== undefined) {
      updateData.website = validatedData.website === "" ? null : validatedData.website;
    }
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon;

    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
