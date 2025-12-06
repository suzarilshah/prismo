/**
 * Income Retriever
 * 
 * Retrieves and analyzes income data for AI context.
 * Tracks multiple income sources, trends, projections,
 * and provides insights for financial planning.
 */

import { db } from "@/db";
import { transactions, users, monthlyPcbRecords } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  IncomeData,
  DateRange,
  getDateRangePreset,
  formatCurrency,
  calculatePercentChange,
} from "./types";

interface IncomeSource {
  type: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  isRecurring: boolean;
  avgAmount: number;
}

interface IncomeTrend {
  month: string;
  amount: number;
  percentChangeFromPrevious: number;
}

interface IncomeAnalytics {
  totalIncome: number;
  avgMonthlyIncome: number;
  incomeSources: IncomeSource[];
  monthlyTrends: IncomeTrend[];
  yearOverYearChange: number | null;
  projectedAnnualIncome: number;
  savingsRate: number;
  incomeStability: "stable" | "variable" | "irregular";
}

export class IncomeRetriever implements DataRetriever {
  name = "income";
  description = "Retrieves income data including salary, bonuses, freelance, investments, and other income sources with trend analysis and projections";

  /**
   * Retrieve income data with analytics
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const dateRange = options?.dateRange || getDateRangePreset("this_year");

    // Get user's base salary info
    const userInfo = await db
      .select({
        salary: users.salary,
        annualIncome: users.annualIncome,
        occupation: users.occupation,
        employmentType: users.employmentType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const baseSalary = parseFloat(userInfo[0]?.salary || "0");
    const employmentType = userInfo[0]?.employmentType || "employed";

    // Get all income transactions
    const incomeTransactions = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        incomeType: transactions.incomeType,
        incomeMonth: transactions.incomeMonth,
        incomeYear: transactions.incomeYear,
        isRecurring: transactions.isRecurring,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, dateRange.start),
          lte(transactions.date, dateRange.end)
        )
      )
      .orderBy(desc(transactions.date));

    // Get PCB records for salary validation
    const pcbRecords = await db
      .select({
        month: monthlyPcbRecords.month,
        year: monthlyPcbRecords.year,
        grossSalary: monthlyPcbRecords.grossSalary,
        bonus: monthlyPcbRecords.bonus,
        allowances: monthlyPcbRecords.allowances,
        commission: monthlyPcbRecords.commission,
        totalIncome: monthlyPcbRecords.totalIncome,
      })
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.userId, userId),
          gte(monthlyPcbRecords.year, dateRange.start.getFullYear())
        )
      )
      .orderBy(desc(monthlyPcbRecords.year), desc(monthlyPcbRecords.month));

    // Get total expenses for savings rate calculation
    const expenseResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, dateRange.start),
          lte(transactions.date, dateRange.end)
        )
      );

    const totalExpenses = parseFloat(expenseResult[0]?.total || "0");

    // Calculate analytics
    const analytics = this.calculateIncomeAnalytics(
      incomeTransactions,
      pcbRecords,
      totalExpenses,
      dateRange
    );

    // Transform to IncomeData
    const incomeData: IncomeData[] = incomeTransactions.map((tx) => ({
      id: tx.id,
      source: tx.description || "Income",
      type: (tx.incomeType as IncomeData["type"]) || "other",
      amount: parseFloat(tx.amount || "0"),
      date: tx.date?.toISOString() || "",
      frequency: tx.isRecurring ? "monthly" : undefined,
      isRecurring: tx.isRecurring || false,
      month: tx.incomeMonth || undefined,
      year: tx.incomeYear || undefined,
    }));

    // Generate insights
    const insights = this.generateInsights(
      analytics,
      baseSalary,
      employmentType,
      dateRange
    );

    return {
      source: this.name,
      description: `Income analysis for ${dateRange.label || "selected period"} with ${incomeData.length} income records`,
      recordCount: incomeData.length,
      dateRange,
      data: incomeData,
      aggregations: {
        totalIncome: formatCurrency(analytics.totalIncome),
        avgMonthlyIncome: formatCurrency(analytics.avgMonthlyIncome),
        projectedAnnualIncome: formatCurrency(analytics.projectedAnnualIncome),
        savingsRate: `${analytics.savingsRate.toFixed(1)}%`,
        incomeStability: analytics.incomeStability,
        primaryIncomeSource: analytics.incomeSources[0]?.type || "N/A",
        numberOfIncomeSources: analytics.incomeSources.length,
        yearOverYearChange: analytics.yearOverYearChange !== null
          ? `${analytics.yearOverYearChange > 0 ? "+" : ""}${analytics.yearOverYearChange.toFixed(1)}%`
          : "N/A",
        baseSalary: baseSalary > 0 ? formatCurrency(baseSalary) : "Not set",
        employmentType,
      },
      insights,
      schema: this.getSchema(),
    };
  }

  /**
   * Calculate comprehensive income analytics
   */
  private calculateIncomeAnalytics(
    incomeTransactions: any[],
    pcbRecords: any[],
    totalExpenses: number,
    dateRange: DateRange
  ): IncomeAnalytics {
    // Calculate total income
    const totalIncome = incomeTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount || "0"),
      0
    );

    // Calculate months in range
    const monthsInRange = Math.max(
      1,
      Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    );

    const avgMonthlyIncome = totalIncome / monthsInRange;

    // Group by income type
    const byType: Record<string, { amount: number; count: number; recurring: number }> = {};
    incomeTransactions.forEach((tx) => {
      const type = tx.incomeType || "other";
      if (!byType[type]) {
        byType[type] = { amount: 0, count: 0, recurring: 0 };
      }
      byType[type].amount += parseFloat(tx.amount || "0");
      byType[type].count += 1;
      if (tx.isRecurring) byType[type].recurring += 1;
    });

    const incomeSources: IncomeSource[] = Object.entries(byType)
      .map(([type, data]) => ({
        type: this.formatIncomeType(type),
        totalAmount: data.amount,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
        transactionCount: data.count,
        isRecurring: data.recurring > data.count / 2,
        avgAmount: data.amount / data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Calculate monthly trends
    const monthlyTrends: IncomeTrend[] = [];
    const byMonth: Record<string, number> = {};

    incomeTransactions.forEach((tx) => {
      if (tx.date) {
        const monthKey = new Date(tx.date).toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        byMonth[monthKey] = (byMonth[monthKey] || 0) + parseFloat(tx.amount || "0");
      }
    });

    // Also include PCB records for more complete picture
    pcbRecords.forEach((record) => {
      const date = new Date(record.year, record.month - 1);
      if (date >= dateRange.start && date <= dateRange.end) {
        const monthKey = date.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        // Only add if not already present from transactions
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = parseFloat(record.totalIncome || "0");
        }
      }
    });

    const sortedMonths = Object.entries(byMonth)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    let previousAmount = 0;
    sortedMonths.forEach(([month, amount]) => {
      monthlyTrends.push({
        month,
        amount,
        percentChangeFromPrevious: previousAmount > 0
          ? calculatePercentChange(amount, previousAmount)
          : 0,
      });
      previousAmount = amount;
    });

    // Calculate year-over-year change if we have data
    let yearOverYearChange: number | null = null;
    const currentYear = new Date().getFullYear();
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, 11, 31);
    
    const lastYearIncome = incomeTransactions
      .filter((tx) => {
        const date = new Date(tx.date);
        return date >= lastYearStart && date <= lastYearEnd;
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

    const thisYearIncome = incomeTransactions
      .filter((tx) => {
        const date = new Date(tx.date);
        return date.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

    if (lastYearIncome > 0 && thisYearIncome > 0) {
      yearOverYearChange = calculatePercentChange(thisYearIncome, lastYearIncome);
    }

    // Calculate projected annual income
    const currentMonth = new Date().getMonth() + 1;
    const projectedAnnualIncome = (avgMonthlyIncome * 12);

    // Calculate savings rate
    const savingsRate = totalIncome > 0
      ? ((totalIncome - totalExpenses) / totalIncome) * 100
      : 0;

    // Determine income stability
    let incomeStability: "stable" | "variable" | "irregular" = "stable";
    if (monthlyTrends.length >= 3) {
      const variationCoefficient = this.calculateCoefficientOfVariation(
        monthlyTrends.map((t) => t.amount)
      );
      if (variationCoefficient > 30) {
        incomeStability = "irregular";
      } else if (variationCoefficient > 15) {
        incomeStability = "variable";
      }
    }

    return {
      totalIncome,
      avgMonthlyIncome,
      incomeSources,
      monthlyTrends,
      yearOverYearChange,
      projectedAnnualIncome,
      savingsRate,
      incomeStability,
    };
  }

  /**
   * Calculate coefficient of variation for stability analysis
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (mean === 0) return 0;

    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 100;
  }

  /**
   * Format income type for display
   */
  private formatIncomeType(type: string): string {
    const typeMap: Record<string, string> = {
      salary: "Salary",
      bonus: "Bonus",
      freelance: "Freelance",
      investment: "Investment",
      commission: "Commission",
      rental: "Rental Income",
      dividend: "Dividend",
      other: "Other Income",
    };
    return typeMap[type] || type;
  }

  /**
   * Generate insights from income data
   */
  private generateInsights(
    analytics: IncomeAnalytics,
    baseSalary: number,
    employmentType: string,
    dateRange: DateRange
  ): string[] {
    const insights: string[] = [];

    // Total income summary
    insights.push(
      `Total income: ${formatCurrency(analytics.totalIncome)} over ${dateRange.label || "selected period"}`
    );

    // Income diversity
    if (analytics.incomeSources.length > 1) {
      const topSource = analytics.incomeSources[0];
      const diversification = 100 - topSource.percentage;
      insights.push(
        `💼 Primary income: ${topSource.type} (${topSource.percentage.toFixed(0)}%). Income diversification: ${diversification.toFixed(0)}%`
      );
    }

    // Savings rate insight
    if (analytics.savingsRate > 0) {
      if (analytics.savingsRate >= 20) {
        insights.push(
          `✅ Excellent savings rate of ${analytics.savingsRate.toFixed(1)}% - above the recommended 20%`
        );
      } else if (analytics.savingsRate >= 10) {
        insights.push(
          `📊 Good savings rate of ${analytics.savingsRate.toFixed(1)}% - consider aiming for 20%`
        );
      } else {
        insights.push(
          `⚠️ Savings rate of ${analytics.savingsRate.toFixed(1)}% is below the recommended 10-20%`
        );
      }
    } else if (analytics.savingsRate < 0) {
      insights.push(
        `🚨 Negative savings rate indicates spending exceeds income`
      );
    }

    // Income stability
    if (analytics.incomeStability === "irregular") {
      insights.push(
        `📈 Income is irregular - consider building a larger emergency fund (6+ months)`
      );
    } else if (analytics.incomeStability === "variable") {
      insights.push(
        `📊 Income shows moderate variation - budget based on average, not peak months`
      );
    }

    // Year-over-year comparison
    if (analytics.yearOverYearChange !== null) {
      if (analytics.yearOverYearChange > 0) {
        insights.push(
          `📈 Income up ${analytics.yearOverYearChange.toFixed(1)}% compared to last year`
        );
      } else if (analytics.yearOverYearChange < 0) {
        insights.push(
          `📉 Income down ${Math.abs(analytics.yearOverYearChange).toFixed(1)}% compared to last year`
        );
      }
    }

    // Projected annual income
    const monthsRemaining = 12 - new Date().getMonth();
    if (monthsRemaining > 0 && monthsRemaining < 12) {
      insights.push(
        `🎯 Projected annual income: ${formatCurrency(analytics.projectedAnnualIncome)} based on current average`
      );
    }

    // Employment type specific advice
    if (employmentType === "self_employed" || employmentType === "freelance") {
      insights.push(
        `💡 As ${employmentType.replace("_", "-")}, remember to set aside money for quarterly tax payments`
      );
    }

    return insights;
  }

  /**
   * Get schema metadata for LLM understanding
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "transactions",
      description:
        "Income transactions including salary, bonuses, freelance work, investments, and other income sources. Filtered for type='income'.",
      columns: [
        { name: "id", type: "uuid", description: "Unique income transaction identifier" },
        { name: "date", type: "timestamp", description: "Date income was received" },
        { name: "description", type: "text", description: "Income source description" },
        { name: "amount", type: "decimal", description: "Income amount in MYR" },
        { name: "incomeType", type: "varchar", description: "Type of income", sampleValues: ["salary", "bonus", "freelance", "investment", "commission", "other"] },
        { name: "incomeMonth", type: "integer", description: "Month the income is for (1-12)" },
        { name: "incomeYear", type: "integer", description: "Year the income is for" },
        { name: "isRecurring", type: "boolean", description: "Whether this is recurring income" },
      ],
      relationships: [
        {
          relatedTable: "users",
          joinColumn: "userId",
          description: "Links to user profile with salary and employment info",
        },
        {
          relatedTable: "monthly_pcb_records",
          joinColumn: "userId",
          description: "Links to PCB records for salary validation",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "income_analysis",
      "tax_optimization",
      "budget_review",
      "goal_progress",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
