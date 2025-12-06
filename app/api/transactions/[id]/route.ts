import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notifyTransactionDeleted, notifyIncomeEdited } from "@/lib/notification-service";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/transactions/[id] - Get a single transaction
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

// PATCH /api/transactions/[id] - Update a transaction
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Handle each field explicitly to avoid null/undefined issues
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.amount !== undefined) {
      updateData.amount = body.amount;
    }
    if (body.date !== undefined) {
      // Convert date string to Date object
      updateData.date = new Date(body.date);
    }
    if (body.categoryId !== undefined) {
      // Allow null for categoryId (optional field)
      updateData.categoryId = body.categoryId || null;
    }
    if (body.paymentMethod !== undefined) {
      updateData.paymentMethod = body.paymentMethod || null;
    }
    if (body.creditCardId !== undefined) {
      updateData.creditCardId = body.creditCardId || null;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }
    if (body.isTaxDeductible !== undefined) {
      updateData.isTaxDeductible = body.isTaxDeductible;
    }
    if (body.vendor !== undefined) {
      updateData.vendor = body.vendor;
    }
    if (body.vendorId !== undefined) {
      updateData.vendorId = body.vendorId || null;
    }
    if (body.type !== undefined) {
      updateData.type = body.type;
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();

    if (!updatedTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await context.params;
    const [deletedTransaction] = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();

    if (!deletedTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Create notification for deleted transaction
    await notifyTransactionDeleted(
      session.user.id,
      parseFloat(deletedTransaction.amount),
      deletedTransaction.currency || "MYR",
      deletedTransaction.type,
      deletedTransaction.description || undefined
    );

    return NextResponse.json({
      success: true,
      data: deletedTransaction,
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
