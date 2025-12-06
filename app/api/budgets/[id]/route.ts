import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/budgets/[id]
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

    const results = await db
      .select({
        budget: budgets,
        category: categories,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.id, id), eq(budgets.userId, authUser.id)))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results[0].budget,
        category: results[0].category,
      },
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// PATCH /api/budgets/[id]
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

    const updateData: Record<string, any> = { updatedAt: new Date() };
    
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.amount !== undefined) updateData.amount = body.amount.toString();
    if (body.period !== undefined) updateData.period = body.period;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.alertThreshold !== undefined) updateData.alertThreshold = body.alertThreshold;

    const [updated] = await db
      .update(budgets)
      .set(updateData)
      .where(and(eq(budgets.id, id), eq(budgets.userId, authUser.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/[id]
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
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, authUser.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
