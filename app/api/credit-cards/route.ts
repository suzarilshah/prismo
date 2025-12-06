import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creditCards, transactions, creditCardStatements, categories } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET - List all credit cards with spending stats
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get("includeStats") === "true";

    // Fetch credit cards
    const cards = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.userId, userId))
      .orderBy(desc(creditCards.isPrimary), desc(creditCards.createdAt));

    if (!includeStats) {
      return NextResponse.json({ data: cards });
    }

    // Calculate spending stats for each card
    const cardsWithStats = await Promise.all(
      cards.map(async (card) => {
        // Get current month spending
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthSpending = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.creditCardId, card.id),
              sql`date >= ${startOfMonth.toISOString()}::timestamp`,
              sql`date <= ${endOfMonth.toISOString()}::timestamp`
            )
          );

        // Get total lifetime spending
        const totalSpending = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(transactions)
          .where(eq(transactions.creditCardId, card.id));

        // Get latest statement
        const latestStatement = await db
          .select()
          .from(creditCardStatements)
          .where(eq(creditCardStatements.creditCardId, card.id))
          .orderBy(desc(creditCardStatements.statementYear), desc(creditCardStatements.statementMonth))
          .limit(1);

        // Get category breakdown for current month
        const categoryBreakdown = await db
          .select({
            name: categories.name,
            amount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              eq(transactions.creditCardId, card.id),
              sql`date >= ${startOfMonth.toISOString()}::timestamp`,
              sql`date <= ${endOfMonth.toISOString()}::timestamp`
            )
          )
          .groupBy(categories.name);

        return {
          ...card,
          stats: {
            currentMonthSpending: monthSpending[0]?.total || 0,
            currentMonthTransactions: monthSpending[0]?.count || 0,
            totalSpending: totalSpending[0]?.total || 0,
            totalTransactions: totalSpending[0]?.count || 0,
            latestStatement: latestStatement[0] || null,
            utilizationRate: card.creditLimit 
              ? ((monthSpending[0]?.total || 0) / Number(card.creditLimit)) * 100 
              : null,
            categoryBreakdown: categoryBreakdown.map(cat => ({
              name: cat.name || "Uncategorized",
              amount: Number(cat.amount)
            })),
          },
        };
      })
    );

    return NextResponse.json({ data: cardsWithStats });
  } catch (error) {
    console.error("Error fetching credit cards:", error);
    return NextResponse.json({ error: "Failed to fetch credit cards" }, { status: 500 });
  }
}

// POST - Create new credit card
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const body = await request.json();
    const {
      bankName,
      cardType,
      cardName,
      cardColor = "gradient-blue",
      cardDesign = "modern",
      lastFourDigits,
      creditLimit,
      billingCycleDay,
      paymentDueDay,
      isPrimary = false,
      notes,
      financeGroupId,
    } = body;

    // Validate required fields
    if (!bankName || !cardType || !cardName) {
      return NextResponse.json(
        { error: "Bank name, card type, and card name are required" },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary cards
    if (isPrimary) {
      await db
        .update(creditCards)
        .set({ isPrimary: false })
        .where(eq(creditCards.userId, userId));
    }

    // Create the credit card
    const [newCard] = await db
      .insert(creditCards)
      .values({
        userId: userId,
        financeGroupId,
        bankName,
        cardType,
        cardName,
        cardColor,
        cardDesign,
        lastFourDigits,
        creditLimit: creditLimit ? String(creditLimit) : null,
        billingCycleDay,
        paymentDueDay,
        isPrimary,
        notes,
      })
      .returning();

    return NextResponse.json({ data: newCard }, { status: 201 });
  } catch (error) {
    console.error("Error creating credit card:", error);
    return NextResponse.json({ error: "Failed to create credit card" }, { status: 500 });
  }
}
