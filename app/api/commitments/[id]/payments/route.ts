import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const paymentUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "overdue", "skipped", "partial"]).optional(),
  isPaid: z.boolean().optional(),
  paidAmount: z.string().or(z.number()).optional(),
  receiptUrl: z.string().optional(),
  documentId: z.string().uuid().optional(),
  notes: z.string().optional(),
  // Optional: create linked transaction
  createTransaction: z.boolean().optional(),
});

// GET /api/commitments/[id]/payments - Get all payments for a commitment
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
    const [commitment] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!commitment) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    const payments = await db
      .select()
      .from(commitmentPayments)
      .where(eq(commitmentPayments.commitmentId, id))
      .orderBy(commitmentPayments.year, commitmentPayments.month);

    // Calculate stats
    const totalPaid = payments.filter((p) => p.isPaid).length;
    const totalPending = payments.filter((p) => p.status === "pending").length;
    const totalOverdue = payments.filter((p) => p.status === "overdue").length;
    const totalAmount = payments
      .filter((p) => p.isPaid && p.paidAmount)
      .reduce((sum, p) => sum + parseFloat(p.paidAmount || "0"), 0);

    return NextResponse.json({
      success: true,
      data: {
        commitment,
        payments,
        stats: {
          totalPaid,
          totalPending,
          totalOverdue,
          totalAmountPaid: totalAmount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching commitment payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/commitments/[id]/payments - Create a payment record for specific month
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
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: "Year and month required" }, { status: 400 });
    }

    // Verify ownership
    const [commitment] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!commitment) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Check if payment record already exists
    const [existing] = await db
      .select()
      .from(commitmentPayments)
      .where(
        and(
          eq(commitmentPayments.commitmentId, id),
          eq(commitmentPayments.year, year),
          eq(commitmentPayments.month, month)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "Payment record already exists" }, { status: 409 });
    }

    // Calculate due date based on commitment's dueDay
    const dueDate = new Date(year, month - 1, commitment.dueDay || 1);

    const [payment] = await db
      .insert(commitmentPayments)
      .values({
        commitmentId: id,
        userId: authUser.id,
        year,
        month,
        dueDate,
        status: "pending",
        isPaid: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error creating payment record:", error);
    return NextResponse.json(
      { error: "Failed to create payment record" },
      { status: 500 }
    );
  }
}

// PATCH /api/commitments/[id]/payments - Update payment status (mark as paid)
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
    const { paymentId, year, month, ...updateData } = body;
    
    const validatedData = paymentUpdateSchema.parse(updateData);

    // Verify commitment ownership
    const [commitment] = await db
      .select()
      .from(commitments)
      .where(and(eq(commitments.id, id), eq(commitments.userId, authUser.id)));

    if (!commitment) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    // Find or create payment record
    let paymentRecord;
    
    if (paymentId) {
      [paymentRecord] = await db
        .select()
        .from(commitmentPayments)
        .where(eq(commitmentPayments.id, paymentId));
    } else if (year && month) {
      [paymentRecord] = await db
        .select()
        .from(commitmentPayments)
        .where(
          and(
            eq(commitmentPayments.commitmentId, id),
            eq(commitmentPayments.year, year),
            eq(commitmentPayments.month, month)
          )
        );

      // Create if doesn't exist
      if (!paymentRecord) {
        const dueDate = new Date(year, month - 1, commitment.dueDay || 1);
        [paymentRecord] = await db
          .insert(commitmentPayments)
          .values({
            commitmentId: id,
            userId: authUser.id,
            year,
            month,
            dueDate,
            status: "pending",
            isPaid: false,
          })
          .returning();
      }
    }

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    // Update payment record
    const updateValues: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // If marking as paid, set paidAt and calculate amount
    if (validatedData.isPaid === true) {
      updateValues.paidAt = new Date();
      updateValues.status = "paid";
      if (!validatedData.paidAmount) {
        updateValues.paidAmount = commitment.amount;
      }
    }

    // If creating a linked transaction
    if (validatedData.isPaid && body.createTransaction) {
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          userId: authUser.id,
          categoryId: commitment.categoryId,
          amount: updateValues.paidAmount || commitment.amount,
          currency: commitment.currency || "MYR",
          description: `Payment: ${commitment.name}`,
          date: new Date(),
          type: "expense",
          paymentMethod: "bank_transfer",
          isRecurring: true,
          recurringId: commitment.subscriptionId,
          notes: `Commitment payment for ${month}/${year}`,
        })
        .returning();

      updateValues.transactionId = newTransaction.id;
    }

    const [updated] = await db
      .update(commitmentPayments)
      .set(updateValues)
      .where(eq(commitmentPayments.id, paymentRecord.id))
      .returning();

    // Update commitment's next due date if paid
    if (validatedData.isPaid && commitment.frequency !== "one_time") {
      const currentNextDue = new Date(commitment.nextDueDate);
      const newNextDue = new Date(currentNextDue);

      switch (commitment.frequency) {
        case "monthly":
          newNextDue.setMonth(newNextDue.getMonth() + 1);
          break;
        case "quarterly":
          newNextDue.setMonth(newNextDue.getMonth() + 3);
          break;
        case "yearly":
          newNextDue.setFullYear(newNextDue.getFullYear() + 1);
          break;
      }

      await db
        .update(commitments)
        .set({ nextDueDate: newNextDue, updatedAt: new Date() })
        .where(eq(commitments.id, id));
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
