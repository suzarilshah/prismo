import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// POST /api/commitments/[id]/terminate - Terminate a commitment
export async function POST(
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
    
    const { 
      reason, 
      effectiveDate, // When the termination takes effect (usually next month)
    } = body;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Parse effective date
    const terminationEffectiveDate = effectiveDate 
      ? new Date(effectiveDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1); // Default: next month

    // Update the commitment as terminated
    const [updated] = await db
      .update(commitments)
      .set({
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason || "User terminated",
        terminationEffectiveDate: terminationEffectiveDate,
        updatedAt: new Date(),
      })
      .where(eq(commitments.id, id))
      .returning();

    // Delete future payment records (after the effective date)
    const effectiveYear = terminationEffectiveDate.getFullYear();
    const effectiveMonth = terminationEffectiveDate.getMonth() + 1;
    
    await db
      .delete(commitmentPayments)
      .where(
        and(
          eq(commitmentPayments.commitmentId, id),
          eq(commitmentPayments.isPaid, false),
          // Only delete payments that haven't been paid and are after effective date
        )
      );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Commitment terminated. Will no longer appear in checklist after ${terminationEffectiveDate.toLocaleDateString()}`,
    });
  } catch (error) {
    console.error("Error terminating commitment:", error);
    return NextResponse.json(
      { error: "Failed to terminate commitment" },
      { status: 500 }
    );
  }
}
