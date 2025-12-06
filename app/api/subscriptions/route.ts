import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, categories, subscriptionPayments } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { notifySubscriptionAdded } from "@/lib/notification-service";

const subscriptionSchema = z.object({
  categoryId: z.string().uuid().optional().nullable().or(z.literal("")),
  name: z.string().min(1).max(255),
  amount: z.string().or(z.number()),
  currency: z.string().default("MYR"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextBillingDate: z.string().or(z.date()),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  isActive: z.boolean().default(true),
  reminderDays: z.number().default(3),
  notes: z.string().optional(),
  website: z.string().optional().or(z.literal("")),
  icon: z.string().optional(),
  planTier: z.string().optional(),
});

// GET /api/subscriptions - List all subscriptions with payment status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const month = searchParams.get("month"); // YYYY-MM format

    // Parse month or use current
    const now = new Date();
    const [targetYear, targetMonth] = month
      ? month.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const conditions = [
      eq(subscriptions.userId, session.user.id),
      isNull(subscriptions.terminatedAt), // Exclude terminated
    ];

    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(subscriptions.isActive, isActive === "true"));
    }

    const results = await db
      .select({
        subscription: subscriptions,
        category: categories,
      })
      .from(subscriptions)
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(subscriptions.isActive), subscriptions.nextBillingDate);

    // Get payment status for current month
    const subscriptionIds = results.map((r) => r.subscription.id);
    const payments = subscriptionIds.length > 0
      ? await db
          .select()
          .from(subscriptionPayments)
          .where(
            and(
              eq(subscriptionPayments.billingYear, targetYear),
              eq(subscriptionPayments.billingMonth, targetMonth)
            )
          )
      : [];

    const paymentMap = new Map(
      payments.map((p) => [p.subscriptionId, p])
    );

    // Calculate summary and add payment status
    const subscriptionsWithStatus = results.map((r) => {
      const sub = r.subscription;
      const payment = paymentMap.get(sub.id);
      const nextBillingDate = new Date(sub.nextBillingDate);
      const daysUntilBilling = Math.ceil(
        (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...sub,
        category: r.category,
        currentPayment: payment || null,
        daysUntilBilling,
        isDueSoon: daysUntilBilling >= 0 && daysUntilBilling <= 7,
        isOverdue: daysUntilBilling < 0,
      };
    });

    // Calculate totals
    const activeSubscriptions = subscriptionsWithStatus.filter((s) => s.isActive);
    const monthlyTotal = activeSubscriptions.reduce((sum, sub) => {
      const amount = parseFloat(sub.amount);
      if (sub.frequency === "monthly") return sum + amount;
      if (sub.frequency === "yearly") return sum + amount / 12;
      if (sub.frequency === "weekly") return sum + amount * 4;
      if (sub.frequency === "daily") return sum + amount * 30;
      return sum;
    }, 0);

    const overdueCount = subscriptionsWithStatus.filter(
      (s) => s.isOverdue && !s.currentPayment?.isPaid
    ).length;
    const dueSoonCount = subscriptionsWithStatus.filter(
      (s) => s.isDueSoon && !s.isOverdue && !s.currentPayment?.isPaid
    ).length;

    return NextResponse.json({
      success: true,
      data: subscriptionsWithStatus,
      summary: {
        total: subscriptionsWithStatus.length,
        active: activeSubscriptions.length,
        monthlyTotal,
        yearlyTotal: monthlyTotal * 12,
        overdue: overdueCount,
        dueSoon: dueSoonCount,
      },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Create a new subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

    // Clean up empty strings
    const categoryId = validatedData.categoryId && validatedData.categoryId !== "" 
      ? validatedData.categoryId 
      : null;
    const website = validatedData.website && validatedData.website !== ""
      ? validatedData.website
      : null;

    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId: session.user.id,
        categoryId,
        name: validatedData.name,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        frequency: validatedData.frequency,
        nextBillingDate: new Date(validatedData.nextBillingDate),
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        isActive: validatedData.isActive,
        reminderDays: validatedData.reminderDays,
        notes: validatedData.notes,
        website,
        icon: validatedData.icon,
        planTier: validatedData.planTier || null,
      })
      .returning();

    // Create initial payment record for current month if billing date is in current month
    const now = new Date();
    const billingDate = new Date(validatedData.nextBillingDate);
    if (
      billingDate.getFullYear() === now.getFullYear() &&
      billingDate.getMonth() === now.getMonth()
    ) {
      await db.insert(subscriptionPayments).values({
        subscriptionId: newSubscription.id,
        userId: session.user.id,
        billingYear: now.getFullYear(),
        billingMonth: now.getMonth() + 1,
        expectedAmount: validatedData.amount.toString(),
        isPaid: false,
      });
    }

    // Create notification for new subscription
    await notifySubscriptionAdded(
      session.user.id,
      validatedData.name,
      parseFloat(validatedData.amount.toString()),
      validatedData.currency,
      validatedData.frequency,
      newSubscription.id
    );

    return NextResponse.json({
      success: true,
      data: newSubscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
