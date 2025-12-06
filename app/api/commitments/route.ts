import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments, categories, subscriptions } from "@/db/schema";
import { eq, and, desc, gte, lte, or } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { notifyCommitmentAdded } from "@/lib/notification-service";

const commitmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().or(z.number()),
  currency: z.string().default("MYR"),
  commitmentType: z.enum([
    "loan", "bill", "insurance", "subscription", "rent", "mortgage",
    "car_loan", "education_loan", "credit_card", "other"
  ]),
  frequency: z.enum(["monthly", "quarterly", "yearly", "one_time"]),
  dueDay: z.number().min(1).max(31).optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  nextDueDate: z.string().or(z.date()),
  totalAmount: z.string().or(z.number()).optional().nullable(),
  remainingAmount: z.string().or(z.number()).optional().nullable(),
  interestRate: z.string().or(z.number()).optional().nullable(),
  payee: z.string().optional(),
  accountNumber: z.string().optional(),
  autoPayEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isPriority: z.boolean().default(false),
  reminderEnabled: z.boolean().default(true),
  reminderDaysBefore: z.number().default(3),
  isTaxDeductible: z.boolean().default(false),
  taxCategory: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  subscriptionId: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/commitments - List all commitments with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("active");
    const includePayments = searchParams.get("includePayments") === "true";
    const month = searchParams.get("month"); // Format: YYYY-MM
    const upcoming = searchParams.get("upcoming") === "true"; // Get upcoming payments

    // Build query conditions
    const conditions = [eq(commitments.userId, userId)];

    if (type) {
      conditions.push(eq(commitments.commitmentType, type));
    }

    if (isActive !== null) {
      conditions.push(eq(commitments.isActive, isActive === "true"));
    }

    // Get commitments with category info
    const results = await db
      .select({
        commitment: commitments,
        category: categories,
      })
      .from(commitments)
      .leftJoin(categories, eq(commitments.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(commitments.isPriority), commitments.nextDueDate);

    // Get payment status for current month if requested
    let paymentsMap: Record<string, any> = {};
    if (includePayments && month) {
      const [year, monthNum] = month.split("-").map(Number);
      const payments = await db
        .select()
        .from(commitmentPayments)
        .where(
          and(
            eq(commitmentPayments.userId, userId),
            eq(commitmentPayments.year, year),
            eq(commitmentPayments.month, monthNum)
          )
        );
      
      paymentsMap = payments.reduce((acc, p) => {
        acc[p.commitmentId] = p;
        return acc;
      }, {} as Record<string, any>);
    }

    // Calculate upcoming payments
    const now = new Date();
    const upcoming30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const data = results.map((r: any) => {
      const commitment = r.commitment || r;
      const nextDue = new Date(commitment.nextDueDate);
      const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;
      const isUpcoming = nextDue <= upcoming30Days;

      return {
        ...commitment,
        category: r.category,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        isUpcoming,
        currentPayment: paymentsMap[commitment.id] || null,
      };
    });

    // Filter for upcoming if requested
    const filteredData = upcoming
      ? data.filter((d: any) => d.isUpcoming && d.isActive)
      : data;

    // Calculate summary stats
    const activeCommitments = data.filter((d: any) => d.isActive);
    const totalMonthly = activeCommitments
      .filter((d: any) => d.frequency === "monthly")
      .reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0);
    const overdueCount = activeCommitments.filter((d: any) => d.isOverdue).length;
    const dueSoonCount = activeCommitments.filter((d: any) => d.isDueSoon).length;

    return NextResponse.json({
      success: true,
      data: filteredData,
      summary: {
        total: data.length,
        active: activeCommitments.length,
        totalMonthly,
        overdue: overdueCount,
        dueSoon: dueSoonCount,
      },
    });
  } catch (error) {
    console.error("Error fetching commitments:", error);
    return NextResponse.json(
      { error: "Failed to fetch commitments" },
      { status: 500 }
    );
  }
}

// POST /api/commitments - Create a new commitment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = commitmentSchema.parse(body);

    const [newCommitment] = await db
      .insert(commitments)
      .values({
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        commitmentType: validatedData.commitmentType,
        frequency: validatedData.frequency,
        dueDay: validatedData.dueDay,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextDueDate: new Date(validatedData.nextDueDate),
        totalAmount: validatedData.totalAmount?.toString() || null,
        remainingAmount: validatedData.remainingAmount?.toString() || null,
        interestRate: validatedData.interestRate?.toString() || null,
        payee: validatedData.payee,
        accountNumber: validatedData.accountNumber,
        autoPayEnabled: validatedData.autoPayEnabled,
        isActive: validatedData.isActive,
        isPriority: validatedData.isPriority,
        reminderEnabled: validatedData.reminderEnabled,
        reminderDaysBefore: validatedData.reminderDaysBefore,
        isTaxDeductible: validatedData.isTaxDeductible,
        taxCategory: validatedData.taxCategory,
        categoryId: validatedData.categoryId || null,
        subscriptionId: validatedData.subscriptionId || null,
        icon: validatedData.icon,
        color: validatedData.color,
        notes: validatedData.notes,
      })
      .returning();

    // Create initial payment record for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextDue = new Date(validatedData.nextDueDate);

    // Only create payment record if commitment is due this month
    if (nextDue.getMonth() + 1 === currentMonth && nextDue.getFullYear() === currentYear) {
      await db.insert(commitmentPayments).values({
        commitmentId: newCommitment.id,
        userId: session.user.id,
        year: currentYear,
        month: currentMonth,
        dueDate: nextDue,
        status: "pending",
        isPaid: false,
      });
    }

    // Create notification for new commitment
    await notifyCommitmentAdded(
      session.user.id,
      validatedData.name,
      parseFloat(validatedData.amount.toString()),
      validatedData.currency,
      validatedData.commitmentType,
      newCommitment.id
    );

    return NextResponse.json({
      success: true,
      data: newCommitment,
    });
  } catch (error) {
    console.error("Error creating commitment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create commitment" },
      { status: 500 }
    );
  }
}
