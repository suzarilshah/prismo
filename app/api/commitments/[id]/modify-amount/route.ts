import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentAmountHistory, commitmentPayments } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// POST /api/commitments/[id]/modify-amount - Upgrade/Downgrade commitment amount
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
      newAmount,
      effectiveDate, // When the new amount takes effect
      reason,
    } = body;

    if (!newAmount || !effectiveDate) {
      return NextResponse.json(
        { error: "New amount and effective date are required" }, 
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    const previousAmount = parseFloat(existing.amount);
    const newAmountValue = parseFloat(newAmount);
    const changeType = newAmountValue > previousAmount ? "upgrade" : "downgrade";
    const effectiveDateParsed = new Date(effectiveDate);

    // Create amount history record
    await db.insert(commitmentAmountHistory).values({
      commitmentId: id,
      userId: authUser.id,
      previousAmount: existing.amount,
      newAmount: newAmount.toString(),
      changeType,
      effectiveDate: effectiveDateParsed,
      reason: reason || `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} from RM ${previousAmount.toFixed(2)} to RM ${newAmountValue.toFixed(2)}`,
    });

    // Update the commitment with new amount
    const [updated] = await db
      .update(commitments)
      .set({
        amount: newAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(commitments.id, id))
      .returning();

    // Update future unpaid commitment payments to use new amount
    const effectiveYear = effectiveDateParsed.getFullYear();
    const effectiveMonth = effectiveDateParsed.getMonth() + 1;

    await db.execute(sql`
      UPDATE commitment_payments 
      SET paid_amount = ${newAmount.toString()}
      WHERE commitment_id = ${id}
        AND is_paid = false
        AND (year > ${effectiveYear} OR (year = ${effectiveYear} AND month >= ${effectiveMonth}))
    `);

    return NextResponse.json({
      success: true,
      data: updated,
      changeType,
      message: `Commitment ${changeType}d from RM ${previousAmount.toFixed(2)} to RM ${newAmountValue.toFixed(2)}. New amount effective from ${effectiveDateParsed.toLocaleDateString()}.`,
    });
  } catch (error) {
    console.error("Error modifying commitment amount:", error);
    return NextResponse.json(
      { error: "Failed to modify commitment amount" },
      { status: 500 }
    );
  }
}

// GET /api/commitments/[id]/modify-amount - Get amount change history
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

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!existing) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Get amount history
    const history = await db
      .select()
      .from(commitmentAmountHistory)
      .where(eq(commitmentAmountHistory.commitmentId, id))
      .orderBy(commitmentAmountHistory.effectiveDate);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching amount history:", error);
    return NextResponse.json(
      { error: "Failed to fetch amount history" },
      { status: 500 }
    );
  }
}
