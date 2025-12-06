import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { notifyGoalAdded } from "@/lib/notification-service";

const goalSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetAmount: z.string().or(z.number()),
  currentAmount: z.string().or(z.number()).default("0"),
  currency: z.string().default("MYR"),
  deadline: z.string().or(z.date()).optional().nullable(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/goals - List all goals
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isCompleted = searchParams.get("isCompleted");

    const conditions = [eq(goals.userId, authUser.id)];

    if (isCompleted !== null && isCompleted !== undefined) {
      conditions.push(eq(goals.isCompleted, isCompleted === "true"));
    }

    const results = await db
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.isCompleted), goals.deadline);

    // Calculate progress percentage for each goal
    const goalsWithProgress = results.map((goal) => {
      const current = parseFloat(goal.currentAmount || "0");
      const target = parseFloat(goal.targetAmount);
      const progress = target > 0 ? Math.round((current / target) * 100) : 0;

      return {
        ...goal,
        progress,
      };
    });

    return NextResponse.json({
      success: true,
      data: goalsWithProgress,
    });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = goalSchema.parse(body);

    const [newGoal] = await db
      .insert(goals)
      .values({
        userId: authUser.id,
        name: validatedData.name,
        description: validatedData.description,
        targetAmount: validatedData.targetAmount.toString(),
        currentAmount: validatedData.currentAmount.toString(),
        currency: validatedData.currency,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        category: validatedData.category,
        icon: validatedData.icon,
        color: validatedData.color,
        isCompleted: false,
      })
      .returning();

    // Create notification for new goal
    await notifyGoalAdded(
      authUser.id,
      validatedData.name,
      parseFloat(validatedData.targetAmount.toString()),
      validatedData.currency,
      newGoal.id
    );

    return NextResponse.json({
      success: true,
      data: newGoal,
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
