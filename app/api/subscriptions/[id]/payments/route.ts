import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionPayments, transactions, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/subscriptions/[id]/payments - Get payment history for a subscription
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
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, authUser.id)
      ),
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const payments = await db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.subscriptionId, id))
      .orderBy(subscriptionPayments.billingYear, subscriptionPayments.billingMonth);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching subscription payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// PATCH /api/subscriptions/[id]/payments - Update payment status
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
    const { year, month, isPaid, createTransaction } = body;

    // Verify ownership
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, authUser.id)
      ),
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Check if payment record exists
    const existingPayment = await db.query.subscriptionPayments.findFirst({
      where: and(
        eq(subscriptionPayments.subscriptionId, id),
        eq(subscriptionPayments.billingYear, year),
        eq(subscriptionPayments.billingMonth, month)
      ),
    });

    let paymentId: string;
    let transactionId: string | null = null;

    // Get or create "Subscriptions" category
    let subscriptionCategory = await db.query.categories.findFirst({
      where: and(
        eq(categories.userId, authUser.id),
        eq(categories.name, "Subscriptions"),
        eq(categories.type, "expense")
      ),
    });

    if (!subscriptionCategory) {
      const [newCategory] = await db
        .insert(categories)
        .values({
          userId: authUser.id,
          name: "Subscriptions",
          color: "#8B5CF6", // Purple/violet
          icon: "📦",
          type: "expense",
          isTaxDeductible: false,
          isSystem: true,
        })
        .returning();
      subscriptionCategory = newCategory;
    }

    // Create transaction if marking as paid
    if (isPaid && createTransaction) {
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          userId: authUser.id,
          categoryId: subscriptionCategory.id,
          amount: subscription.amount,
          currency: subscription.currency || "MYR",
          description: `${subscription.name} - ${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`,
          date: new Date(),
          type: "expense",
          vendor: subscription.name,
          isRecurring: true,
          recurringId: subscription.id,
        })
        .returning();
      transactionId = newTransaction.id;
    }

    if (existingPayment) {
      // Update existing payment
      await db
        .update(subscriptionPayments)
        .set({
          isPaid,
          paidAt: isPaid ? new Date() : null,
          paidAmount: isPaid ? subscription.amount : null,
          transactionId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPayments.id, existingPayment.id));
      paymentId = existingPayment.id;
    } else {
      // Create new payment record
      const [newPayment] = await db
        .insert(subscriptionPayments)
        .values({
          subscriptionId: id,
          userId: authUser.id,
          billingYear: year,
          billingMonth: month,
          expectedAmount: subscription.amount,
          paidAmount: isPaid ? subscription.amount : null,
          isPaid,
          paidAt: isPaid ? new Date() : null,
          transactionId,
        })
        .returning();
      paymentId = newPayment.id;
    }

    return NextResponse.json({
      success: true,
      paymentId,
      transactionId,
    });
  } catch (error) {
    console.error("Error updating subscription payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
