/**
 * Transaction Retriever
 * 
 * Retrieves and analyzes transaction data for AI context.
 * Provides smart filtering, aggregations, and pattern detection.
 */

import { db } from "@/db";
import { transactions, categories, vendors, creditCards } from "@/db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  TransactionData,
  FinancialAggregation,
  DateRange,
  getDateRangePreset,
  formatCurrency,
  calculatePercentChange,
} from "./types";

export class TransactionRetriever implements DataRetriever {
  name = "transactions";
  description = "Retrieves transaction history with spending patterns, category breakdowns, and trend analysis";

  /**
   * Retrieve transactions with smart filtering and aggregations
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const dateRange = options?.dateRange || getDateRangePreset("this_month");
    const limit = options?.limit || 100;

    // Build query conditions
    const conditions = [
      eq(transactions.userId, userId),
      gte(transactions.date, dateRange.start),
      lte(transactions.date, dateRange.end),
    ];

    if (options?.categoryIds?.length) {
      conditions.push(inArray(transactions.categoryId, options.categoryIds));
    }

    if (options?.minAmount) {
      conditions.push(gte(transactions.amount, options.minAmount.toString()));
    }

    if (options?.maxAmount) {
      conditions.push(lte(transactions.amount, options.maxAmount.toString()));
    }

    // Fetch transactions with related data
    const rawTransactions = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        vendor: transactions.vendor,
        vendorName: vendors.name,
        paymentMethod: transactions.paymentMethod,
        creditCardId: transactions.creditCardId,
        creditCardName: creditCards.cardName,
        isTaxDeductible: transactions.isTaxDeductible,
        taxCategory: transactions.taxCategory,
        notes: transactions.notes,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
      .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(limit);

    // Transform to TransactionData
    const data: TransactionData[] = rawTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date?.toISOString() || "",
      description: tx.description || "",
      amount: parseFloat(tx.amount || "0"),
      type: tx.type as "income" | "expense",
      category: tx.categoryName || undefined,
      categoryIcon: tx.categoryIcon || undefined,
      vendor: options?.anonymize 
        ? this.anonymizeVendor(tx.vendorName || tx.vendor || "")
        : (tx.vendorName || tx.vendor || undefined),
      paymentMethod: tx.paymentMethod || undefined,
      creditCardName: tx.creditCardName || undefined,
      isTaxDeductible: tx.isTaxDeductible || false,
      taxCategory: tx.taxCategory || undefined,
      notes: tx.notes || undefined,
    }));

    // Calculate aggregations
    const aggregations = this.calculateAggregations(data);

    // Generate insights
    const insights = this.generateInsights(data, aggregations, dateRange);

    // Get previous period for comparison
    const previousPeriodAggregations = await this.getPreviousPeriodAggregations(
      userId,
      dateRange
    );

    return {
      source: this.name,
      description: `${data.length} transactions from ${dateRange.label || "selected period"}`,
      recordCount: data.length,
      dateRange,
      data,
      aggregations: {
        totalExpenses: aggregations.expenses.total,
        totalIncome: aggregations.income.total,
        netCashFlow: aggregations.income.total - aggregations.expenses.total,
        averageTransaction: aggregations.expenses.average,
        expensesByCategory: JSON.stringify(aggregations.expenses.byCategory),
        expensesByPaymentMethod: JSON.stringify(aggregations.expenses.byPaymentMethod),
        expensesTrend: aggregations.expenses.trend || "stable",
        percentChangeFromLastPeriod: previousPeriodAggregations
          ? calculatePercentChange(
              aggregations.expenses.total,
              previousPeriodAggregations.expenses.total
            ).toFixed(1)
          : "N/A",
      },
      insights,
      schema: this.getSchema(),
    };
  }

  /**
   * Calculate financial aggregations from transactions
   */
  private calculateAggregations(data: TransactionData[]): {
    expenses: FinancialAggregation;
    income: FinancialAggregation;
  } {
    const expenses = data.filter((t) => t.type === "expense");
    const income = data.filter((t) => t.type === "income");

    return {
      expenses: this.aggregateTransactions(expenses),
      income: this.aggregateTransactions(income),
    };
  }

  /**
   * Aggregate a set of transactions
   */
  private aggregateTransactions(transactions: TransactionData[]): FinancialAggregation {
    if (transactions.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        byCategory: {},
        byMonth: {},
        byPaymentMethod: {},
        trend: "stable",
      };
    }

    const amounts = transactions.map((t) => t.amount);
    const total = amounts.reduce((sum, a) => sum + a, 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    transactions.forEach((t) => {
      const cat = t.category || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    transactions.forEach((t) => {
      const month = new Date(t.date).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      byMonth[month] = (byMonth[month] || 0) + t.amount;
    });

    // Group by payment method
    const byPaymentMethod: Record<string, number> = {};
    transactions.forEach((t) => {
      const method = t.paymentMethod || "Unknown";
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + t.amount;
    });

    // Determine trend (simple: compare first half to second half)
    const midpoint = Math.floor(transactions.length / 2);
    const firstHalf = transactions.slice(0, midpoint);
    const secondHalf = transactions.slice(midpoint);
    const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);
    
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    const percentDiff = calculatePercentChange(secondHalfTotal, firstHalfTotal);
    if (percentDiff > 10) trend = "increasing";
    else if (percentDiff < -10) trend = "decreasing";

    return {
      total,
      average: total / transactions.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: transactions.length,
      byCategory,
      byMonth,
      byPaymentMethod,
      trend,
      percentChange: percentDiff,
    };
  }

  /**
   * Get previous period aggregations for comparison
   */
  private async getPreviousPeriodAggregations(
    userId: string,
    currentRange: DateRange
  ): Promise<{ expenses: FinancialAggregation; income: FinancialAggregation } | null> {
    // Calculate previous period (same duration, before current)
    const duration = currentRange.end.getTime() - currentRange.start.getTime();
    const previousStart = new Date(currentRange.start.getTime() - duration);
    const previousEnd = new Date(currentRange.start.getTime() - 1);

    const rawTransactions = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        categoryName: categories.name,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, previousStart),
          lte(transactions.date, previousEnd)
        )
      );

    if (rawTransactions.length === 0) return null;

    const data: TransactionData[] = rawTransactions.map((tx) => ({
      id: "",
      date: tx.date?.toISOString() || "",
      description: "",
      amount: parseFloat(tx.amount || "0"),
      type: tx.type as "income" | "expense",
      category: tx.categoryName || undefined,
    }));

    return this.calculateAggregations(data);
  }

  /**
   * Generate insights from transaction data
   */
  private generateInsights(
    data: TransactionData[],
    aggregations: { expenses: FinancialAggregation; income: FinancialAggregation },
    dateRange: DateRange
  ): string[] {
    const insights: string[] = [];

    // Overall summary
    insights.push(
      `Total spending: ${formatCurrency(aggregations.expenses.total)} across ${aggregations.expenses.count} transactions`
    );

    if (aggregations.income.total > 0) {
      const savingsRate =
        ((aggregations.income.total - aggregations.expenses.total) /
          aggregations.income.total) *
        100;
      insights.push(
        `Net cash flow: ${formatCurrency(aggregations.income.total - aggregations.expenses.total)} (${savingsRate.toFixed(1)}% savings rate)`
      );
    }

    // Top spending categories
    const sortedCategories = Object.entries(aggregations.expenses.byCategory || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (sortedCategories.length > 0) {
      const topCategories = sortedCategories
        .map(([cat, amount]) => `${cat}: ${formatCurrency(amount)}`)
        .join(", ");
      insights.push(`Top spending categories: ${topCategories}`);
    }

    // Trend insight
    if (aggregations.expenses.trend === "increasing") {
      insights.push(
        `⚠️ Spending is trending upward by ${Math.abs(aggregations.expenses.percentChange || 0).toFixed(1)}%`
      );
    } else if (aggregations.expenses.trend === "decreasing") {
      insights.push(
        `✅ Spending is trending downward by ${Math.abs(aggregations.expenses.percentChange || 0).toFixed(1)}%`
      );
    }

    // Large transactions
    const largeTransactions = data.filter(
      (t) => t.type === "expense" && t.amount > aggregations.expenses.average * 3
    );
    if (largeTransactions.length > 0) {
      insights.push(
        `${largeTransactions.length} unusually large transaction(s) detected (>3x average)`
      );
    }

    // Tax-deductible spending
    const taxDeductible = data.filter((t) => t.isTaxDeductible);
    if (taxDeductible.length > 0) {
      const taxTotal = taxDeductible.reduce((sum, t) => sum + t.amount, 0);
      insights.push(
        `Tax-deductible expenses: ${formatCurrency(taxTotal)} across ${taxDeductible.length} transactions`
      );
    }

    return insights;
  }

  /**
   * Anonymize vendor name for privacy
   */
  private anonymizeVendor(vendor: string): string {
    if (!vendor) return "Unknown Vendor";
    // Keep first letter and replace rest with asterisks
    return vendor.charAt(0) + "*".repeat(Math.min(vendor.length - 1, 8));
  }

  /**
   * Get schema metadata for LLM understanding
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "transactions",
      description:
        "Financial transactions including expenses and income, with category classification, vendor tracking, and payment method information",
      columns: [
        { name: "id", type: "uuid", description: "Unique transaction identifier" },
        { name: "date", type: "timestamp", description: "Date and time of transaction" },
        { name: "description", type: "text", description: "Transaction description" },
        { name: "amount", type: "decimal", description: "Transaction amount in user's currency" },
        {
          name: "type",
          type: "varchar",
          description: "Transaction type",
          sampleValues: ["expense", "income"],
        },
        { name: "category", type: "varchar", description: "Spending category (e.g., Food, Transport, Entertainment)" },
        { name: "vendor", type: "varchar", description: "Merchant or payee name" },
        {
          name: "paymentMethod",
          type: "varchar",
          description: "Payment method used",
          sampleValues: ["credit_card", "debit", "cash", "bank_transfer", "e-wallet"],
        },
        { name: "isTaxDeductible", type: "boolean", description: "Whether eligible for tax deduction" },
        { name: "taxCategory", type: "varchar", description: "LHDN tax relief category if applicable" },
      ],
      relationships: [
        {
          relatedTable: "categories",
          joinColumn: "categoryId",
          description: "Links to expense/income category",
        },
        {
          relatedTable: "credit_cards",
          joinColumn: "creditCardId",
          description: "Links to credit card if used for payment",
        },
        {
          relatedTable: "vendors",
          joinColumn: "vendorId",
          description: "Links to merchant/vendor record",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "spending_analysis",
      "tax_optimization",
      "budget_review",
      "comparison",
      "anomaly_detection",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
