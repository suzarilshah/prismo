import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creditCards, transactions, creditCardStatements } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET - Get single credit card with detailed stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const { id } = await params;

    const [card] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));

    if (!card) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // Get monthly spending for last 12 months
    const monthlySpending = await db
      .select({
        month: sql<string>`TO_CHAR(date, 'YYYY-MM')`,
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.creditCardId, id),
          sql`date >= NOW() - INTERVAL '12 months'`
        )
      )
      .groupBy(sql`TO_CHAR(date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(date, 'YYYY-MM')`);

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.creditCardId, id))
      .orderBy(desc(transactions.date))
      .limit(10);

    // Get all statements
    const statements = await db
      .select()
      .from(creditCardStatements)
      .where(eq(creditCardStatements.creditCardId, id))
      .orderBy(desc(creditCardStatements.statementYear), desc(creditCardStatements.statementMonth));

    // Calculate current month spending
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const currentMonthStats = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.creditCardId, id),
          sql`date >= ${startOfMonth.toISOString()}::timestamp`,
          sql`date <= ${endOfMonth.toISOString()}::timestamp`
        )
      );

    return NextResponse.json({
      data: {
        ...card,
        stats: {
          currentMonthSpending: currentMonthStats[0]?.total || 0,
          currentMonthTransactions: currentMonthStats[0]?.count || 0,
          utilizationRate: card.creditLimit
            ? ((currentMonthStats[0]?.total || 0) / Number(card.creditLimit)) * 100
            : null,
        },
        monthlySpending,
        recentTransactions,
        statements,
      },
    });
  } catch (error) {
    console.error("Error fetching credit card:", error);
    return NextResponse.json({ error: "Failed to fetch credit card" }, { status: 500 });
  }
}

// PATCH - Update credit card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const { id } = await params;
    const body = await request.json();

    // Check if card exists and belongs to user
    const [existingCard] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));

    if (!existingCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // If setting as primary, unset other primary cards
    if (body.isPrimary && !existingCard.isPrimary) {
      await db
        .update(creditCards)
        .set({ isPrimary: false })
        .where(and(eq(creditCards.userId, userId), eq(creditCards.isPrimary, true)));
    }

    // Update the card
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (body.bankName !== undefined) updateData.bankName = body.bankName;
    if (body.cardType !== undefined) updateData.cardType = body.cardType;
    if (body.cardName !== undefined) updateData.cardName = body.cardName;
    if (body.cardColor !== undefined) updateData.cardColor = body.cardColor;
    if (body.cardDesign !== undefined) updateData.cardDesign = body.cardDesign;
    if (body.lastFourDigits !== undefined) updateData.lastFourDigits = body.lastFourDigits;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit ? String(body.creditLimit) : null;
    if (body.billingCycleDay !== undefined) updateData.billingCycleDay = body.billingCycleDay;
    if (body.paymentDueDay !== undefined) updateData.paymentDueDay = body.paymentDueDay;
    if (body.isPrimary !== undefined) updateData.isPrimary = body.isPrimary;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updatedCard] = await db
      .update(creditCards)
      .set(updateData)
      .where(eq(creditCards.id, id))
      .returning();

    return NextResponse.json({ data: updatedCard });
  } catch (error) {
    console.error("Error updating credit card:", error);
    return NextResponse.json({ error: "Failed to update credit card" }, { status: 500 });
  }
}

// DELETE - Delete credit card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const { id } = await params;

    // Check if card exists and belongs to user
    const [existingCard] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));

    if (!existingCard) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

    // Remove credit card references from transactions
    await db
      .update(transactions)
      .set({ creditCardId: null, paymentMethod: "other" })
      .where(eq(transactions.creditCardId, id));

    // Delete the card (statements will cascade)
    await db.delete(creditCards).where(eq(creditCards.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return NextResponse.json({ error: "Failed to delete credit card" }, { status: 500 });
  }
}
