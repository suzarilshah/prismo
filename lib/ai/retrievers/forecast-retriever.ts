/**
 * Forecast Retriever
 * 
 * Retrieves spending pattern data and generates predictions.
 * Uses historical data for trend analysis, anomaly detection,
 * and spending forecasts for upcoming periods.
 */

import { db } from "@/db";
import { transactions, spendingPatterns, categories, budgets } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  ForecastData,
  DateRange,
  getDateRangePreset,
  formatCurrency,
  calculatePercentChange,
} from "./types";

interface SpendingVelocity {
  daily: number;
  weekly: number;
  currentMonthProjection: number;
  daysRemainingInMonth: number;
}

interface CategoryForecast {
  category: string;
  historicalAvg: number;
  lastMonth: number;
  trend: "increasing" | "decreasing" | "stable";
  forecastAmount: number;
  confidence: number;
  budgetAmount?: number;
  projectedOverBudget?: boolean;
}

interface SeasonalPattern {
  month: number;
  monthName: string;
  avgSpending: number;
  isHighSpendMonth: boolean;
  typicalCategories: string[];
}

interface ForecastAnalytics {
  monthlyForecasts: ForecastData[];
  categoryForecasts: CategoryForecast[];
  spendingVelocity: SpendingVelocity;
  seasonalPatterns: SeasonalPattern[];
  anomalies: string[];
  overallTrend: "increasing" | "decreasing" | "stable";
  confidenceScore: number;
}

export class ForecastRetriever implements DataRetriever {
  name = "forecasts";
  description = "Retrieves spending pattern analysis, predictions, and forecasts based on historical data with seasonality and trend detection";

  /**
   * Retrieve forecast data with predictions
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get historical transactions (last 12 months)
    const historicalStart = new Date(currentYear - 1, currentMonth, 1);
    const historicalEnd = now;

    const historicalTransactions = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        type: transactions.type,
        categoryName: categories.name,
        categoryId: transactions.categoryId,
        dayOfWeek: transactions.dayOfWeek,
        transactionHour: transactions.transactionHour,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, historicalStart),
          lte(transactions.date, historicalEnd)
        )
      )
      .orderBy(desc(transactions.date));

    // Get pre-computed spending patterns if available
    const patterns = await db
      .select()
      .from(spendingPatterns)
      .where(eq(spendingPatterns.userId, userId))
      .orderBy(desc(spendingPatterns.year), desc(spendingPatterns.month))
      .limit(12);

    // Get current budgets for comparison
    const currentBudgets = await db
      .select({
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        amount: budgets.amount,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId));

    // Calculate analytics
    const analytics = this.calculateForecastAnalytics(
      historicalTransactions,
      patterns,
      currentBudgets,
      now
    );

    // Generate insights
    const insights = this.generateInsights(analytics, now);

    return {
      source: this.name,
      description: `Spending forecast and pattern analysis based on ${historicalTransactions.length} historical transactions`,
      recordCount: analytics.monthlyForecasts.length,
      dateRange: {
        start: historicalStart,
        end: new Date(currentYear, currentMonth + 3, 0), // Forecast 3 months ahead
        label: "12-month history + 3-month forecast",
      },
      data: analytics.monthlyForecasts,
      aggregations: {
        overallTrend: analytics.overallTrend,
        confidenceScore: `${(analytics.confidenceScore * 100).toFixed(0)}%`,
        currentMonthProjection: formatCurrency(analytics.spendingVelocity.currentMonthProjection),
        dailySpendingRate: formatCurrency(analytics.spendingVelocity.daily),
        weeklySpendingRate: formatCurrency(analytics.spendingVelocity.weekly),
        daysRemainingInMonth: analytics.spendingVelocity.daysRemainingInMonth,
        categoriesAboveBudget: analytics.categoryForecasts.filter(c => c.projectedOverBudget).length,
        anomaliesDetected: analytics.anomalies.length,
        highSpendMonths: analytics.seasonalPatterns
          .filter(p => p.isHighSpendMonth)
          .map(p => p.monthName)
          .join(", ") || "None identified",
      },
      insights,
      schema: this.getSchema(),
      relevanceScore: 0.9,
    };
  }

  /**
   * Calculate comprehensive forecast analytics
   */
  private calculateForecastAnalytics(
    transactions: any[],
    patterns: any[],
    budgets: any[],
    now: Date
  ): ForecastAnalytics {
    // Group transactions by month
    const byMonth: Record<string, { amount: number; count: number; categories: Record<string, number> }> = {};
    
    transactions.forEach((tx) => {
      if (!tx.date) return;
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { amount: 0, count: 0, categories: {} };
      }
      
      const amount = parseFloat(tx.amount || "0");
      byMonth[monthKey].amount += amount;
      byMonth[monthKey].count += 1;
      
      const cat = tx.categoryName || "Uncategorized";
      byMonth[monthKey].categories[cat] = (byMonth[monthKey].categories[cat] || 0) + amount;
    });

    // Calculate monthly forecasts
    const monthlyForecasts = this.generateMonthlyForecasts(byMonth, now);

    // Calculate category forecasts
    const categoryForecasts = this.generateCategoryForecasts(transactions, budgets, now);

    // Calculate spending velocity (current month pace)
    const spendingVelocity = this.calculateSpendingVelocity(transactions, now);

    // Detect seasonal patterns
    const seasonalPatterns = this.detectSeasonalPatterns(byMonth);

    // Detect anomalies
    const anomalies = this.detectAnomalies(transactions, byMonth);

    // Calculate overall trend
    const sortedMonths = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
    
    let overallTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (sortedMonths.length >= 3) {
      const firstHalf = sortedMonths.slice(0, Math.floor(sortedMonths.length / 2));
      const secondHalf = sortedMonths.slice(Math.floor(sortedMonths.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, [, data]) => sum + data.amount, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, [, data]) => sum + data.amount, 0) / secondHalf.length;
      
      const percentChange = calculatePercentChange(secondHalfAvg, firstHalfAvg);
      if (percentChange > 10) overallTrend = "increasing";
      else if (percentChange < -10) overallTrend = "decreasing";
    }

    // Calculate confidence score based on data quality
    const confidenceScore = Math.min(1, (transactions.length / 100) * (Object.keys(byMonth).length / 12));

    return {
      monthlyForecasts,
      categoryForecasts,
      spendingVelocity,
      seasonalPatterns,
      anomalies,
      overallTrend,
      confidenceScore,
    };
  }

  /**
   * Generate monthly forecasts
   */
  private generateMonthlyForecasts(
    byMonth: Record<string, { amount: number; count: number; categories: Record<string, number> }>,
    now: Date
  ): ForecastData[] {
    const forecasts: ForecastData[] = [];
    const sortedMonths = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b));

    if (sortedMonths.length === 0) return forecasts;

    // Calculate weighted moving average (recent months weighted more)
    const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // Last 5 months
    const recentMonths = sortedMonths.slice(-5);
    
    let weightedSum = 0;
    let weightTotal = 0;
    recentMonths.forEach((month, i) => {
      const weight = weights[Math.min(i, weights.length - 1)];
      weightedSum += month[1].amount * weight;
      weightTotal += weight;
    });
    
    const baselineForecast = weightTotal > 0 ? weightedSum / weightTotal : 0;

    // Generate forecasts for next 3 months
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const forecastMonth = forecastDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      // Adjust for seasonal patterns
      const historicalMonth = sortedMonths.find(([key]) => {
        const [, month] = key.split("-");
        return parseInt(month) === forecastDate.getMonth() + 1;
      });

      let seasonalAdjustment = 1;
      if (historicalMonth) {
        const avgAmount = sortedMonths.reduce((sum, [, data]) => sum + data.amount, 0) / sortedMonths.length;
        if (avgAmount > 0) {
          seasonalAdjustment = historicalMonth[1].amount / avgAmount;
        }
      }

      const predictedExpenses = baselineForecast * seasonalAdjustment;

      // Get top categories from recent data
      const allCategories: Record<string, number> = {};
      recentMonths.forEach(([, data]) => {
        Object.entries(data.categories).forEach(([cat, amount]) => {
          allCategories[cat] = (allCategories[cat] || 0) + amount;
        });
      });

      const topExpenseCategories = Object.entries(allCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({
          category,
          amount: (amount / recentMonths.length) * seasonalAdjustment,
        }));

      // Confidence decreases for further forecasts
      const confidence = Math.max(0.5, 0.9 - (i * 0.1));

      forecasts.push({
        month: forecastMonth,
        predictedExpenses,
        predictedIncome: 0, // Would need income data integration
        confidence,
        topExpenseCategories,
        alerts: this.generateAlerts(predictedExpenses, topExpenseCategories, forecastDate),
      });
    }

    return forecasts;
  }

  /**
   * Generate category-specific forecasts
   */
  private generateCategoryForecasts(
    transactions: any[],
    budgets: any[],
    now: Date
  ): CategoryForecast[] {
    const categoryData: Record<string, { amounts: number[]; total: number; months: Set<string> }> = {};

    // Group by category and month
    transactions.forEach((tx) => {
      const cat = tx.categoryName || "Uncategorized";
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!categoryData[cat]) {
        categoryData[cat] = { amounts: [], total: 0, months: new Set() };
      }
      
      const amount = parseFloat(tx.amount || "0");
      categoryData[cat].total += amount;
      categoryData[cat].months.add(monthKey);
    });

    // Calculate monthly averages per category
    Object.entries(categoryData).forEach(([cat, data]) => {
      const monthlyAvg = data.total / Math.max(1, data.months.size);
      data.amounts.push(monthlyAvg);
    });

    // Get last month data
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const lastMonthByCategory: Record<string, number> = {};
    transactions
      .filter((tx) => {
        const date = new Date(tx.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .forEach((tx) => {
        const cat = tx.categoryName || "Uncategorized";
        lastMonthByCategory[cat] = (lastMonthByCategory[cat] || 0) + parseFloat(tx.amount || "0");
      });

    // Create budget lookup
    const budgetLookup: Record<string, number> = {};
    budgets.forEach((b) => {
      if (b.categoryName) {
        budgetLookup[b.categoryName] = parseFloat(b.amount || "0");
      }
    });

    // Generate forecasts
    return Object.entries(categoryData)
      .map(([category, data]) => {
        const historicalAvg = data.total / Math.max(1, data.months.size);
        const lastMonth = lastMonthByCategory[category] || 0;
        
        // Determine trend
        let trend: "increasing" | "decreasing" | "stable" = "stable";
        if (lastMonth > historicalAvg * 1.15) trend = "increasing";
        else if (lastMonth < historicalAvg * 0.85) trend = "decreasing";

        // Forecast based on trend
        let forecastAmount = historicalAvg;
        if (trend === "increasing") forecastAmount = (historicalAvg + lastMonth) / 2;
        else if (trend === "decreasing") forecastAmount = (historicalAvg + lastMonth) / 2;

        const budgetAmount = budgetLookup[category];

        return {
          category,
          historicalAvg,
          lastMonth,
          trend,
          forecastAmount,
          confidence: Math.min(0.9, 0.5 + (data.months.size / 24)),
          budgetAmount,
          projectedOverBudget: budgetAmount ? forecastAmount > budgetAmount : undefined,
        };
      })
      .sort((a, b) => b.forecastAmount - a.forecastAmount);
  }

  /**
   * Calculate current spending velocity
   */
  private calculateSpendingVelocity(transactions: any[], now: Date): SpendingVelocity {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = daysInMonth - dayOfMonth;

    // Current month spending
    const currentMonthSpending = transactions
      .filter((tx) => new Date(tx.date) >= monthStart && new Date(tx.date) <= now)
      .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

    const daily = dayOfMonth > 0 ? currentMonthSpending / dayOfMonth : 0;
    const weekly = daily * 7;
    const currentMonthProjection = daily * daysInMonth;

    return {
      daily,
      weekly,
      currentMonthProjection,
      daysRemainingInMonth,
    };
  }

  /**
   * Detect seasonal spending patterns
   */
  private detectSeasonalPatterns(
    byMonth: Record<string, { amount: number; count: number; categories: Record<string, number> }>
  ): SeasonalPattern[] {
    const monthlyAverages: Record<number, { total: number; count: number; categories: Record<string, number> }> = {};

    Object.entries(byMonth).forEach(([key, data]) => {
      const month = parseInt(key.split("-")[1]);
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = { total: 0, count: 0, categories: {} };
      }
      monthlyAverages[month].total += data.amount;
      monthlyAverages[month].count += 1;
      
      Object.entries(data.categories).forEach(([cat, amount]) => {
        monthlyAverages[month].categories[cat] = (monthlyAverages[month].categories[cat] || 0) + amount;
      });
    });

    const overallAvg = Object.values(monthlyAverages).reduce((sum, m) => sum + m.total / m.count, 0) / 12;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return Object.entries(monthlyAverages)
      .map(([month, data]) => {
        const avgSpending = data.count > 0 ? data.total / data.count : 0;
        const topCategories = Object.entries(data.categories)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat]) => cat);

        return {
          month: parseInt(month),
          monthName: monthNames[parseInt(month) - 1],
          avgSpending,
          isHighSpendMonth: avgSpending > overallAvg * 1.2,
          typicalCategories: topCategories,
        };
      })
      .sort((a, b) => a.month - b.month);
  }

  /**
   * Detect spending anomalies
   */
  private detectAnomalies(
    transactions: any[],
    byMonth: Record<string, { amount: number; count: number; categories: Record<string, number> }>
  ): string[] {
    const anomalies: string[] = [];

    // Calculate overall averages
    const monthlyAmounts = Object.values(byMonth).map(m => m.amount);
    if (monthlyAmounts.length < 3) return anomalies;

    const avgMonthly = monthlyAmounts.reduce((sum, a) => sum + a, 0) / monthlyAmounts.length;
    const stdDev = Math.sqrt(
      monthlyAmounts.reduce((sum, a) => sum + Math.pow(a - avgMonthly, 2), 0) / monthlyAmounts.length
    );

    // Check for months with unusual spending
    Object.entries(byMonth).forEach(([key, data]) => {
      if (data.amount > avgMonthly + 2 * stdDev) {
        const [year, month] = key.split("-");
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString("default", { month: "long", year: "numeric" });
        anomalies.push(`High spending detected in ${monthName}: ${formatCurrency(data.amount)} (${((data.amount - avgMonthly) / avgMonthly * 100).toFixed(0)}% above average)`);
      }
    });

    // Check for unusually large individual transactions
    const transactionAmounts = transactions.map(t => parseFloat(t.amount || "0"));
    const avgTransaction = transactionAmounts.reduce((sum, a) => sum + a, 0) / transactionAmounts.length;
    
    const largeTransactions = transactions.filter(t => parseFloat(t.amount || "0") > avgTransaction * 5);
    if (largeTransactions.length > 0) {
      anomalies.push(`${largeTransactions.length} unusually large transaction(s) detected (>5x average)`);
    }

    return anomalies;
  }

  /**
   * Generate alerts for forecast
   */
  private generateAlerts(
    predictedExpenses: number,
    topCategories: { category: string; amount: number }[],
    forecastDate: Date
  ): string[] {
    const alerts: string[] = [];

    // Holiday spending alerts
    const month = forecastDate.getMonth();
    if (month === 11) { // December
      alerts.push("🎄 Holiday season - expect higher entertainment and shopping expenses");
    } else if (month === 0) { // January
      alerts.push("📅 Chinese New Year season - typically higher spending month");
    } else if (month === 4 || month === 5) { // May/June
      alerts.push("🕌 Hari Raya season - may see increased spending");
    } else if (month === 9 || month === 10) { // October/November
      alerts.push("🪔 Deepavali season - potential for higher discretionary spending");
    }

    return alerts;
  }

  /**
   * Generate insights from forecast data
   */
  private generateInsights(analytics: ForecastAnalytics, now: Date): string[] {
    const insights: string[] = [];

    // Current month projection
    insights.push(
      `📊 Current month projection: ${formatCurrency(analytics.spendingVelocity.currentMonthProjection)} based on ${formatCurrency(analytics.spendingVelocity.daily)}/day spending rate`
    );

    // Days remaining context
    if (analytics.spendingVelocity.daysRemainingInMonth > 0) {
      insights.push(
        `📅 ${analytics.spendingVelocity.daysRemainingInMonth} days remaining in the month`
      );
    }

    // Overall trend
    const trendEmoji = analytics.overallTrend === "increasing" ? "📈" : 
                       analytics.overallTrend === "decreasing" ? "📉" : "➡️";
    insights.push(
      `${trendEmoji} Overall spending trend: ${analytics.overallTrend}`
    );

    // Categories over budget
    const overBudgetCategories = analytics.categoryForecasts.filter(c => c.projectedOverBudget);
    if (overBudgetCategories.length > 0) {
      const categories = overBudgetCategories.slice(0, 3).map(c => c.category).join(", ");
      insights.push(
        `⚠️ ${overBudgetCategories.length} categor${overBudgetCategories.length === 1 ? "y" : "ies"} projected to exceed budget: ${categories}`
      );
    }

    // Seasonal patterns
    const highSpendMonths = analytics.seasonalPatterns.filter(p => p.isHighSpendMonth);
    if (highSpendMonths.length > 0) {
      const upcomingHighSpend = highSpendMonths.find(m => m.month > now.getMonth() + 1 && m.month <= now.getMonth() + 4);
      if (upcomingHighSpend) {
        insights.push(
          `🗓️ ${upcomingHighSpend.monthName} is historically a high-spend month. Top categories: ${upcomingHighSpend.typicalCategories.join(", ")}`
        );
      }
    }

    // Anomalies
    if (analytics.anomalies.length > 0) {
      analytics.anomalies.slice(0, 2).forEach(anomaly => {
        insights.push(`🔍 ${anomaly}`);
      });
    }

    // Confidence note
    if (analytics.confidenceScore < 0.7) {
      insights.push(
        `📝 Forecast confidence is ${(analytics.confidenceScore * 100).toFixed(0)}%. More transaction history will improve accuracy.`
      );
    }

    return insights;
  }

  /**
   * Get schema metadata for LLM understanding
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "spending_patterns",
      description:
        "Spending pattern analysis and forecasts based on historical transaction data. Includes trend detection, seasonality analysis, and category-level predictions.",
      columns: [
        { name: "month", type: "varchar", description: "Forecast month (e.g., 'January 2025')" },
        { name: "predictedExpenses", type: "decimal", description: "Predicted total expenses for the month" },
        { name: "predictedIncome", type: "decimal", description: "Predicted total income for the month" },
        { name: "confidence", type: "decimal", description: "Forecast confidence score (0-1)" },
        { name: "topExpenseCategories", type: "jsonb", description: "Predicted top spending categories" },
        { name: "alerts", type: "jsonb", description: "Relevant alerts for the forecast period" },
      ],
      relationships: [
        {
          relatedTable: "transactions",
          joinColumn: "userId",
          description: "Historical transactions used for pattern analysis",
        },
        {
          relatedTable: "budgets",
          joinColumn: "userId",
          description: "Budgets for comparison with forecasts",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "forecast_review",
      "spending_analysis",
      "budget_review",
      "anomaly_detection",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
