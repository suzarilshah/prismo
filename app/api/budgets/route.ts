import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notifyBudgetAdded } from "@/lib/notification-service";

// GET /api/budgets - List all budgets
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const results = await db
      .select({
        budget: budgets,
        category: categories,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, session.user.id))
      .orderBy(budgets.createdAt);

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        ...r.budget,
        category: r.category,
      })),
    });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Create a new budget
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    const [newBudget] = await db
      .insert(budgets)
      .values({
        userId: session.user.id,
        categoryId: body.categoryId,
        amount: body.amount.toString(),
        period: body.period || "monthly",
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        alertThreshold: body.alertThreshold || 80,
      })
      .returning();

    // Get category name for notification
    let categoryName = "Budget";
    if (body.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, body.categoryId))
        .limit(1);
      if (category) {
        categoryName = category.name;
      }
    }

    // Create notification for new budget
    await notifyBudgetAdded(
      session.user.id,
      categoryName,
      parseFloat(body.amount),
      "MYR",
      newBudget.id
    );

    return NextResponse.json({
      success: true,
      data: newBudget,
    });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
