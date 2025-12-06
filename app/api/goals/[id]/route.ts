import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { notifyGoalEdited, notifyGoalProgress } from "@/lib/notification-service";

const updateGoalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  targetAmount: z.string().or(z.number()).optional(),
  currentAmount: z.string().or(z.number()).optional(),
  currency: z.string().optional(),
  deadline: z.string().or(z.date()).optional().nullable(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

// GET /api/goals/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, authUser.id)))
      .limit(1);

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const current = parseFloat(goal.currentAmount || "0");
    const target = parseFloat(goal.targetAmount);
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: { ...goal, progress },
    });
  } catch (error) {
    console.error("Error fetching goal:", error);
    return NextResponse.json(
      { error: "Failed to fetch goal" },
      { status: 500 }
    );
  }
}

// PATCH /api/goals/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateGoalSchema.parse(body);

    // Get the existing goal to check progress milestones
    const [existingGoal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, authUser.id)))
      .limit(1);

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const oldProgress = existingGoal.targetAmount 
      ? Math.round((parseFloat(existingGoal.currentAmount || "0") / parseFloat(existingGoal.targetAmount)) * 100)
      : 0;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.targetAmount) updateData.targetAmount = validatedData.targetAmount.toString();
    if (validatedData.currentAmount !== undefined) updateData.currentAmount = validatedData.currentAmount.toString();
    if (validatedData.currency) updateData.currency = validatedData.currency;
    if (validatedData.deadline !== undefined) {
      updateData.deadline = validatedData.deadline ? new Date(validatedData.deadline) : null;
    }
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;
    if (validatedData.isCompleted !== undefined) {
      updateData.isCompleted = validatedData.isCompleted;
      if (validatedData.isCompleted) {
        updateData.completedAt = new Date();
      }
    }

    const [updated] = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.userId, authUser.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Calculate new progress and check for milestone notifications
    const newProgress = updated.targetAmount 
      ? Math.round((parseFloat(updated.currentAmount || "0") / parseFloat(updated.targetAmount)) * 100)
      : 0;

    // Check for progress milestones (50%, 75%, 100%)
    const milestones = [50, 75, 100];
    for (const milestone of milestones) {
      if (oldProgress < milestone && newProgress >= milestone) {
        await notifyGoalProgress(
          authUser.id,
          updated.name,
          milestone,
          updated.id
        );
        break; // Only notify for the highest crossed milestone
      }
    }

    // Notify goal edited (if not just a progress update)
    if (validatedData.name || validatedData.targetAmount || validatedData.deadline !== undefined) {
      await notifyGoalEdited(authUser.id, updated.name, updated.id);
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating goal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, authUser.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
