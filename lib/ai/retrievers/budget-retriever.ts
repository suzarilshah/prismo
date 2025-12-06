/**
 * Budget Retriever
 * 
 * Retrieves budget data with utilization analysis, projections,
 * and smart recommendations for budget optimization.
 */

import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  BudgetData,
  DateRange,
  getDateRangePreset,
  formatCurrency,
} from "./types";

export class BudgetRetriever implements DataRetriever {
  name = "budgets";
  description = "Retrieves budget allocations, spending against budgets, and utilization analysis";

  /**
   * Retrieve budgets with spending analysis
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const dateRange = options?.dateRange || getDateRangePreset("this_month");

    // Fetch budgets with category info
    const rawBudgets = await db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        amount: budgets.amount,
        period: budgets.period,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        alertThreshold: budgets.alertThreshold,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId));

    // Calculate spending for each budget
    const budgetData: BudgetData[] = await Promise.all(
      rawBudgets.map(async (budget) => {
        // Get spending for this budget's category in the current period
        const spendingResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.categoryId, budget.categoryId!),
              eq(transactions.type, "expense"),
              gte(transactions.date, dateRange.start),
              lte(transactions.date, dateRange.end)
            )
          );

        const spent = Number(spendingResult[0]?.total || 0);
        const budgetAmount = parseFloat(budget.amount || "0");
        const remaining = budgetAmount - spent;
        const utilizationPercent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        // Calculate days remaining in period
        const now = new Date();
        const endDate = budget.endDate || dateRange.end;
        const daysRemaining = Math.max(
          0,
          Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Project if will overspend
        const daysElapsed = Math.ceil(
          (now.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const dailySpendingRate = daysElapsed > 0 ? spent / daysElapsed : 0;
        const projectedTotal = dailySpendingRate * (daysElapsed + daysRemaining);
        const projectedOverspend = Math.max(0, projectedTotal - budgetAmount);

        // Determine status
        let status: "under" | "warning" | "over" = "under";
        const alertThreshold = budget.alertThreshold || 80;
        if (utilizationPercent >= 100) status = "over";
        else if (utilizationPercent >= alertThreshold) status = "warning";

        return {
          id: budget.id,
          category: budget.categoryName || "Unknown",
          categoryIcon: budget.categoryIcon || undefined,
          budgetAmount,
          spentAmount: spent,
          remainingAmount: remaining,
          utilizationPercent,
          period: budget.period || "monthly",
          status,
          daysRemaining,
          projectedOverspend: projectedOverspend > 0 ? projectedOverspend : undefined,
        };
      })
    );

    // Sort by utilization (highest first)
    budgetData.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    // Calculate aggregations
    const totalBudget = budgetData.reduce((sum, b) => sum + b.budgetAmount, 0);
    const totalSpent = budgetData.reduce((sum, b) => sum + b.spentAmount, 0);
    const overBudgetCount = budgetData.filter((b) => b.status === "over").length;
    const warningCount = budgetData.filter((b) => b.status === "warning").length;

    // Generate insights
    const insights = this.generateInsights(budgetData, totalBudget, totalSpent);

    return {
      source: this.name,
      description: `${budgetData.length} budget categories for ${dateRange.label || "current period"}`,
      recordCount: budgetData.length,
      dateRange,
      data: budgetData,
      aggregations: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        overallUtilization: totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0",
        overBudgetCount,
        warningCount,
        healthyCount: budgetData.length - overBudgetCount - warningCount,
      },
      insights,
      schema: this.getSchema(),
    };
  }

  /**
   * Generate insights from budget data
   */
  private generateInsights(
    budgets: BudgetData[],
    totalBudget: number,
    totalSpent: number
  ): string[] {
    const insights: string[] = [];

    // Overall budget health
    const overallUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    insights.push(
      `Overall budget utilization: ${overallUtilization.toFixed(1)}% (${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)})`
    );

    // Over-budget categories
    const overBudget = budgets.filter((b) => b.status === "over");
    if (overBudget.length > 0) {
      const overCategories = overBudget
        .map((b) => `${b.category} (${b.utilizationPercent.toFixed(0)}%)`)
        .join(", ");
      insights.push(`⚠️ Over budget: ${overCategories}`);
    }

    // Warning categories
    const warning = budgets.filter((b) => b.status === "warning");
    if (warning.length > 0) {
      const warningCategories = warning
        .map((b) => `${b.category} (${b.utilizationPercent.toFixed(0)}%)`)
        .join(", ");
      insights.push(`⚡ Approaching limit: ${warningCategories}`);
    }

    // Projected overspend
    const projectedOverspend = budgets.filter((b) => b.projectedOverspend && b.projectedOverspend > 0);
    if (projectedOverspend.length > 0) {
      const totalProjected = projectedOverspend.reduce(
        (sum, b) => sum + (b.projectedOverspend || 0),
        0
      );
      insights.push(
        `📊 Projected overspend by month end: ${formatCurrency(totalProjected)} across ${projectedOverspend.length} categories`
      );
    }

    // Under-utilized budgets (potential reallocation opportunity)
    const underUtilized = budgets.filter(
      (b) => b.utilizationPercent < 50 && b.budgetAmount > 100
    );
    if (underUtilized.length > 0) {
      const underCategories = underUtilized
        .map((b) => `${b.category} (${b.utilizationPercent.toFixed(0)}%)`)
        .join(", ");
      insights.push(
        `💡 Under-utilized budgets (potential reallocation): ${underCategories}`
      );
    }

    // Remaining budget recommendation
    if (budgets.length > 0) {
      const avgDaysRemaining = Math.round(
        budgets.reduce((sum, b) => sum + (b.daysRemaining || 0), 0) / budgets.length
      );
      const remainingBudget = totalBudget - totalSpent;
      if (avgDaysRemaining > 0 && remainingBudget > 0) {
        const dailyBudget = remainingBudget / avgDaysRemaining;
        insights.push(
          `Daily spending budget for remaining ${avgDaysRemaining} days: ${formatCurrency(dailyBudget)}`
        );
      }
    }

    return insights;
  }

  /**
   * Get schema metadata
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "budgets",
      description:
        "Monthly or custom period budgets per spending category with utilization tracking",
      columns: [
        { name: "id", type: "uuid", description: "Unique budget identifier" },
        { name: "category", type: "varchar", description: "Budget category name" },
        { name: "budgetAmount", type: "decimal", description: "Allocated budget amount" },
        { name: "spentAmount", type: "decimal", description: "Amount spent against this budget" },
        { name: "remainingAmount", type: "decimal", description: "Remaining budget amount" },
        {
          name: "utilizationPercent",
          type: "decimal",
          description: "Percentage of budget used (0-100+)",
        },
        {
          name: "period",
          type: "varchar",
          description: "Budget period",
          sampleValues: ["monthly", "weekly", "yearly", "custom"],
        },
        {
          name: "status",
          type: "varchar",
          description: "Budget status",
          sampleValues: ["under", "warning", "over"],
        },
        { name: "daysRemaining", type: "integer", description: "Days remaining in budget period" },
        {
          name: "projectedOverspend",
          type: "decimal",
          description: "Projected overspend amount based on current rate",
        },
      ],
      relationships: [
        {
          relatedTable: "categories",
          joinColumn: "categoryId",
          description: "Links to spending category",
        },
        {
          relatedTable: "transactions",
          joinColumn: "categoryId",
          description: "Transactions count against this budget's category",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "budget_review",
      "spending_analysis",
      "general_advice",
      "comparison",
    ];
    return relevantIntents.includes(intent);
  }
}
