import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { notifyIncomeAdded, notifyExpenseAdded } from "@/lib/notification-service";

const transactionSchema = z.object({
  categoryId: z.string().uuid().optional().nullable().or(z.literal("")),
  amount: z.string().or(z.number()),
  currency: z.string().default("MYR"),
  description: z.string().optional(),
  date: z.string().or(z.date()),
  type: z.enum(["income", "expense"]),
  // Income-specific fields
  incomeType: z.enum(["salary", "bonus", "freelance", "investment", "commission", "other"]).optional(),
  incomeMonth: z.number().min(1).max(12).optional().or(z.string().transform(v => v ? parseInt(v) : undefined)),
  incomeYear: z.number().optional().or(z.string().transform(v => v ? parseInt(v) : undefined)),
  // Payment method
  paymentMethod: z.string().optional().nullable(),
  creditCardId: z.string().uuid().optional().nullable(),
  vendor: z.string().optional(),
  vendorId: z.string().uuid().optional().nullable().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// GET /api/transactions - List all transactions with filters
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query conditions
    const conditions = [eq(transactions.userId, userId)];

    if (startDate) {
      conditions.push(gte(transactions.date, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(transactions.date, new Date(endDate)));
    }

    if (type) {
      conditions.push(eq(transactions.type, type as "income" | "expense"));
    }

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    const results = await db
      .select({
        transaction: transactions,
        category: categories,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        ...r.transaction,
        category: r.category,
      })),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transactionSchema.parse(body);

    // Handle empty categoryId - convert to null
    const categoryId = validatedData.categoryId && validatedData.categoryId !== "" 
      ? validatedData.categoryId 
      : null;

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        categoryId: categoryId,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        description: validatedData.description,
        date: new Date(validatedData.date),
        type: validatedData.type,
        // Income-specific fields
        incomeType: validatedData.type === "income" ? validatedData.incomeType : null,
        incomeMonth: validatedData.type === "income" ? (validatedData.incomeMonth as number | undefined) : null,
        incomeYear: validatedData.type === "income" ? (validatedData.incomeYear as number | undefined) : null,
        // Payment method
        paymentMethod: validatedData.paymentMethod,
        creditCardId: validatedData.creditCardId,
        vendor: validatedData.vendor,
        tags: validatedData.tags,
        notes: validatedData.notes,
      })
      .returning();

    // Create notification for transaction
    if (validatedData.type === "income") {
      await notifyIncomeAdded(
        session.user.id,
        parseFloat(validatedData.amount.toString()),
        validatedData.currency,
        validatedData.description
      );
    } else {
      // Get category name for expense notification
      let categoryName: string | undefined;
      if (categoryId) {
        const [cat] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
        categoryName = cat?.name;
      }
      await notifyExpenseAdded(
        session.user.id,
        parseFloat(validatedData.amount.toString()),
        validatedData.currency,
        validatedData.description,
        categoryName
      );
    }

    return NextResponse.json({
      success: true,
      data: newTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
