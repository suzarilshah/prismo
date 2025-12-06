/**
 * Credit Card Retriever
 * 
 * Retrieves and analyzes credit card data for AI context.
 * Provides utilization tracking, spending patterns per card, and payment insights.
 */

import { db } from "@/db";
import { creditCards, creditCardStatements, transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  CreditCardData,
  DateRange,
  getDateRangePreset,
  formatCurrency,
  calculatePercentChange,
} from "./types";

interface CardSpendingBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface CardAnalytics {
  totalSpending: number;
  avgTransactionAmount: number;
  transactionCount: number;
  topCategories: CardSpendingBreakdown[];
  utilizationPercent: number;
  daysUntilDue: number | null;
}

export class CreditCardRetriever implements DataRetriever {
  name = "credit_cards";
  description = "Retrieves credit card information with utilization, spending patterns, payment due dates, and category breakdowns";

  /**
   * Retrieve credit cards with analytics
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const dateRange = options?.dateRange || getDateRangePreset("this_month");

    // Fetch all active credit cards
    const rawCards = await db
      .select({
        id: creditCards.id,
        bankName: creditCards.bankName,
        cardName: creditCards.cardName,
        cardType: creditCards.cardType,
        creditLimit: creditCards.creditLimit,
        lastFourDigits: creditCards.lastFourDigits,
        billingCycleDay: creditCards.billingCycleDay,
        paymentDueDay: creditCards.paymentDueDay,
        isActive: creditCards.isActive,
        isPrimary: creditCards.isPrimary,
      })
      .from(creditCards)
      .where(
        and(
          eq(creditCards.userId, userId),
          eq(creditCards.isActive, true)
        )
      );

    // Get spending analytics for each card
    const cardDataWithAnalytics: CreditCardData[] = await Promise.all(
      rawCards.map(async (card) => {
        const analytics = await this.getCardAnalytics(card.id, userId, dateRange);
        const currentBalance = await this.getCurrentBalance(card.id, userId);

        return {
          id: card.id,
          bankName: card.bankName,
          cardName: card.cardName,
          cardType: card.cardType,
          creditLimit: parseFloat(card.creditLimit || "0"),
          currentBalance,
          availableCredit: parseFloat(card.creditLimit || "0") - currentBalance,
          utilizationPercent: card.creditLimit 
            ? (currentBalance / parseFloat(card.creditLimit)) * 100 
            : 0,
          paymentDueDay: card.paymentDueDay || undefined,
          daysUntilDue: analytics.daysUntilDue ?? undefined,
          monthlySpending: analytics.totalSpending,
          topCategories: analytics.topCategories.slice(0, 5).map(c => ({
            category: c.category,
            amount: c.amount,
          })),
          rewardsType: this.inferRewardsType(card.cardName),
        };
      })
    );

    // Calculate aggregations
    const totalCreditLimit = cardDataWithAnalytics.reduce(
      (sum, card) => sum + card.creditLimit,
      0
    );
    const totalBalance = cardDataWithAnalytics.reduce(
      (sum, card) => sum + card.currentBalance,
      0
    );
    const totalMonthlySpending = cardDataWithAnalytics.reduce(
      (sum, card) => sum + card.monthlySpending,
      0
    );
    const overallUtilization = totalCreditLimit > 0 
      ? (totalBalance / totalCreditLimit) * 100 
      : 0;

    // Identify cards with high utilization
    const highUtilizationCards = cardDataWithAnalytics.filter(
      card => card.utilizationPercent > 70
    );

    // Generate insights
    const insights = this.generateInsights(cardDataWithAnalytics, {
      totalCreditLimit,
      totalBalance,
      overallUtilization,
      highUtilizationCards,
    });

    return {
      source: this.name,
      description: `${cardDataWithAnalytics.length} credit cards with spending analytics for ${dateRange.label || "selected period"}`,
      recordCount: cardDataWithAnalytics.length,
      dateRange,
      data: cardDataWithAnalytics,
      aggregations: {
        totalCards: cardDataWithAnalytics.length,
        totalCreditLimit: formatCurrency(totalCreditLimit),
        totalBalance: formatCurrency(totalBalance),
        totalAvailableCredit: formatCurrency(totalCreditLimit - totalBalance),
        overallUtilization: `${overallUtilization.toFixed(1)}%`,
        totalMonthlySpending: formatCurrency(totalMonthlySpending),
        highUtilizationCardCount: highUtilizationCards.length,
        cardsNearDue: cardDataWithAnalytics.filter(
          c => c.daysUntilDue !== undefined && c.daysUntilDue <= 7
        ).length,
      },
      insights,
      schema: this.getSchema(),
    };
  }

  /**
   * Get spending analytics for a specific card
   */
  private async getCardAnalytics(
    cardId: string,
    userId: string,
    dateRange: DateRange
  ): Promise<CardAnalytics> {
    // Get transactions for this card in the date range
    const cardTransactions = await db
      .select({
        amount: transactions.amount,
        categoryName: categories.name,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.creditCardId, cardId),
          eq(transactions.type, "expense"),
          gte(transactions.date, dateRange.start),
          lte(transactions.date, dateRange.end)
        )
      );

    const amounts = cardTransactions.map(t => parseFloat(t.amount || "0"));
    const totalSpending = amounts.reduce((sum, a) => sum + a, 0);

    // Group by category
    const categorySpending: Record<string, { amount: number; count: number }> = {};
    cardTransactions.forEach(t => {
      const cat = t.categoryName || "Uncategorized";
      if (!categorySpending[cat]) {
        categorySpending[cat] = { amount: 0, count: 0 };
      }
      categorySpending[cat].amount += parseFloat(t.amount || "0");
      categorySpending[cat].count += 1;
    });

    const topCategories: CardSpendingBreakdown[] = Object.entries(categorySpending)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Get card details for due date calculation
    const cardDetails = await db
      .select({
        paymentDueDay: creditCards.paymentDueDay,
        creditLimit: creditCards.creditLimit,
      })
      .from(creditCards)
      .where(eq(creditCards.id, cardId))
      .limit(1);

    let daysUntilDue: number | null = null;
    if (cardDetails[0]?.paymentDueDay) {
      const today = new Date();
      const dueDay = cardDetails[0].paymentDueDay;
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      
      const dueDate = thisMonth > today ? thisMonth : nextMonth;
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      totalSpending,
      avgTransactionAmount: amounts.length > 0 ? totalSpending / amounts.length : 0,
      transactionCount: amounts.length,
      topCategories,
      utilizationPercent: 0, // Will be calculated with current balance
      daysUntilDue,
    };
  }

  /**
   * Calculate current balance for a card based on recent transactions
   */
  private async getCurrentBalance(cardId: string, userId: string): Promise<number> {
    // Get the most recent statement
    const latestStatement = await db
      .select({
        closingBalance: creditCardStatements.closingBalance,
        paidAmount: creditCardStatements.paidAmount,
        statementYear: creditCardStatements.statementYear,
        statementMonth: creditCardStatements.statementMonth,
      })
      .from(creditCardStatements)
      .where(eq(creditCardStatements.creditCardId, cardId))
      .orderBy(desc(creditCardStatements.statementYear), desc(creditCardStatements.statementMonth))
      .limit(1);

    let balance = 0;

    if (latestStatement.length > 0) {
      const stmt = latestStatement[0];
      balance = parseFloat(stmt.closingBalance || "0") - parseFloat(stmt.paidAmount || "0");
      
      // Add transactions since statement
      const stmtDate = new Date(stmt.statementYear, stmt.statementMonth - 1, 1);
      const recentTxns = await db
        .select({
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.creditCardId, cardId),
            eq(transactions.type, "expense"),
            gte(transactions.date, stmtDate)
          )
        );

      balance += recentTxns.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    } else {
      // No statement, calculate from all transactions this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthTxns = await db
        .select({
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.creditCardId, cardId),
            eq(transactions.type, "expense"),
            gte(transactions.date, monthStart)
          )
        );

      balance = monthTxns.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    }

    return Math.max(0, balance);
  }

  /**
   * Infer rewards type from card name
   */
  private inferRewardsType(cardName: string): string | undefined {
    const name = cardName.toLowerCase();
    if (name.includes("cash") || name.includes("rebate")) return "Cashback";
    if (name.includes("miles") || name.includes("travel") || name.includes("air")) return "Miles";
    if (name.includes("points") || name.includes("reward")) return "Points";
    if (name.includes("fuel") || name.includes("petrol")) return "Fuel Rebate";
    if (name.includes("shop") || name.includes("retail")) return "Shopping Rewards";
    return undefined;
  }

  /**
   * Generate insights from credit card data
   */
  private generateInsights(
    cards: CreditCardData[],
    aggregations: {
      totalCreditLimit: number;
      totalBalance: number;
      overallUtilization: number;
      highUtilizationCards: CreditCardData[];
    }
  ): string[] {
    const insights: string[] = [];

    // Overall utilization insight
    if (aggregations.overallUtilization > 70) {
      insights.push(
        `⚠️ High overall credit utilization at ${aggregations.overallUtilization.toFixed(1)}%. Consider paying down balances to improve credit health.`
      );
    } else if (aggregations.overallUtilization < 30) {
      insights.push(
        `✅ Healthy credit utilization at ${aggregations.overallUtilization.toFixed(1)}%. This is good for your credit score.`
      );
    }

    // High utilization cards warning
    if (aggregations.highUtilizationCards.length > 0) {
      const cardNames = aggregations.highUtilizationCards
        .map(c => c.cardName)
        .slice(0, 2)
        .join(", ");
      insights.push(
        `${aggregations.highUtilizationCards.length} card(s) with high utilization (>70%): ${cardNames}`
      );
    }

    // Upcoming payment due dates
    const urgentCards = cards.filter(
      c => c.daysUntilDue !== undefined && c.daysUntilDue <= 5
    );
    if (urgentCards.length > 0) {
      insights.push(
        `🔔 ${urgentCards.length} card payment(s) due within 5 days`
      );
    }

    // Top spending card
    const topSpendingCard = cards.reduce(
      (max, card) => card.monthlySpending > max.monthlySpending ? card : max,
      cards[0]
    );
    if (topSpendingCard && topSpendingCard.monthlySpending > 0) {
      insights.push(
        `Most used card: ${topSpendingCard.cardName} with ${formatCurrency(topSpendingCard.monthlySpending)} this month`
      );
    }

    // Card optimization suggestion
    const cashbackCards = cards.filter(c => c.rewardsType === "Cashback");
    if (cashbackCards.length > 0) {
      insights.push(
        `💡 You have ${cashbackCards.length} cashback card(s). Maximize rewards by using them for everyday purchases.`
      );
    }

    return insights;
  }

  /**
   * Get schema metadata for LLM understanding
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "credit_cards",
      description:
        "Credit card information including limits, balances, utilization, and spending patterns. Includes Malaysian banks like Maybank, CIMB, Public Bank, etc.",
      columns: [
        { name: "id", type: "uuid", description: "Unique credit card identifier" },
        { name: "bankName", type: "varchar", description: "Issuing bank name", sampleValues: ["Maybank", "CIMB Bank", "Public Bank", "RHB Bank"] },
        { name: "cardName", type: "varchar", description: "Card product name (e.g., Maybank Visa Infinite)" },
        { name: "cardType", type: "varchar", description: "Card network", sampleValues: ["Visa", "Mastercard", "American Express"] },
        { name: "creditLimit", type: "decimal", description: "Total credit limit in MYR" },
        { name: "currentBalance", type: "decimal", description: "Current outstanding balance" },
        { name: "utilizationPercent", type: "decimal", description: "Credit utilization percentage (balance/limit × 100)" },
        { name: "paymentDueDay", type: "integer", description: "Day of month when payment is due (1-31)" },
        { name: "monthlySpending", type: "decimal", description: "Total spending on this card for the period" },
        { name: "topCategories", type: "jsonb", description: "Top spending categories for this card" },
        { name: "rewardsType", type: "varchar", description: "Type of rewards offered", sampleValues: ["Cashback", "Miles", "Points", "Fuel Rebate"] },
      ],
      relationships: [
        {
          relatedTable: "transactions",
          joinColumn: "creditCardId",
          description: "Links transactions made with this card",
        },
        {
          relatedTable: "credit_card_statements",
          joinColumn: "creditCardId",
          description: "Monthly statement records for this card",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "credit_card_advice",
      "spending_analysis",
      "budget_review",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
