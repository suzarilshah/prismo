import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/commitments/[id] - Get a single commitment with payment history
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

    const [commitment] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!commitment) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Get payment history
    const payments = await db
      .select()
      .from(commitmentPayments)
      .where(eq(commitmentPayments.commitmentId, id))
      .orderBy(commitmentPayments.year, commitmentPayments.month);

    return NextResponse.json({
      success: true,
      data: {
        ...commitment,
        payments,
      },
    });
  } catch (error) {
    console.error("Error fetching commitment:", error);
    return NextResponse.json(
      { error: "Failed to fetch commitment" },
      { status: 500 }
    );
  }
}

// PATCH /api/commitments/[id] - Update a commitment
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

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(commitments)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(commitments.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating commitment:", error);
    return NextResponse.json(
      { error: "Failed to update commitment" },
      { status: 500 }
    );
  }
}

// DELETE /api/commitments/[id] - Delete a commitment
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

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Delete (cascade will handle payments)
    await db.delete(commitments).where(eq(commitments.id, id));

    return NextResponse.json({
      success: true,
      message: "Commitment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting commitment:", error);
    return NextResponse.json(
      { error: "Failed to delete commitment" },
      { status: 500 }
    );
  }
}
