import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taxDeductions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tax-deductions/[id] - Get a specific tax deduction
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const [deduction] = await db
      .select()
      .from(taxDeductions)
      .where(and(eq(taxDeductions.id, id), eq(taxDeductions.userId, authUser.id)));

    if (!deduction) {
      return NextResponse.json({ error: "Tax deduction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deduction });
  } catch (error) {
    console.error("Error fetching tax deduction:", error);
    return NextResponse.json({ error: "Failed to fetch tax deduction" }, { status: 500 });
  }
}

// PATCH /api/tax-deductions/[id] - Update a tax deduction
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(taxDeductions)
      .set({
        category: body.category,
        lhdnCategory: body.lhdnCategory,
        amount: body.amount?.toString(),
        description: body.description,
        dateIncurred: body.dateIncurred ? new Date(body.dateIncurred) : undefined,
        receiptUrl: body.receiptUrl,
        verified: body.verified,
        updatedAt: new Date(),
      })
      .where(and(eq(taxDeductions.id, id), eq(taxDeductions.userId, authUser.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Tax deduction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating tax deduction:", error);
    return NextResponse.json({ error: "Failed to update tax deduction" }, { status: 500 });
  }
}

// DELETE /api/tax-deductions/[id] - Delete a tax deduction
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const [deleted] = await db
      .delete(taxDeductions)
      .where(and(eq(taxDeductions.id, id), eq(taxDeductions.userId, authUser.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Tax deduction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Error deleting tax deduction:", error);
    return NextResponse.json({ error: "Failed to delete tax deduction" }, { status: 500 });
  }
}
