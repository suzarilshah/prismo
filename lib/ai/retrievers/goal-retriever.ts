/**
 * Goal Retriever
 * 
 * Retrieves financial goals with progress tracking, projections,
 * and savings rate recommendations.
 */

import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  GoalData,
  formatCurrency,
} from "./types";

export class GoalRetriever implements DataRetriever {
  name = "goals";
  description = "Retrieves financial goals with progress tracking, projections, and achievement status";

  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const rawGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId));

    const now = new Date();

    const goalData: GoalData[] = rawGoals.map((goal) => {
      const targetAmount = parseFloat(goal.targetAmount || "0");
      const currentAmount = parseFloat(goal.currentAmount || "0");
      const progressPercent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

      // Calculate target date info (schema uses 'deadline' field)
      const targetDate = goal.deadline ? new Date(goal.deadline) : null;
      const daysRemaining = targetDate
        ? Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : undefined;

      // Calculate required monthly savings
      const remainingAmount = targetAmount - currentAmount;
      const monthsRemaining = daysRemaining ? daysRemaining / 30 : undefined;
      const requiredMonthlySavings = monthsRemaining && monthsRemaining > 0
        ? remainingAmount / monthsRemaining
        : undefined;

      // Calculate monthly contribution rate from history
      const createdAt = goal.createdAt ? new Date(goal.createdAt) : now;
      const monthsSinceCreation = Math.max(
        1,
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const monthlyContribution = currentAmount / monthsSinceCreation;

      // Project completion date based on current rate
      let projectedCompletionDate: string | undefined;
      if (monthlyContribution > 0 && remainingAmount > 0) {
        const monthsToComplete = remainingAmount / monthlyContribution;
        const projectedDate = new Date(now);
        projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsToComplete));
        projectedCompletionDate = projectedDate.toISOString().split("T")[0];
      }

      // Determine status
      let status: "on_track" | "behind" | "ahead" | "completed" = "on_track";
      if (progressPercent >= 100) {
        status = "completed";
      } else if (targetDate) {
        const expectedProgress = targetDate
          ? ((now.getTime() - createdAt.getTime()) /
              (targetDate.getTime() - createdAt.getTime())) *
            100
          : 0;
        if (progressPercent >= expectedProgress + 10) status = "ahead";
        else if (progressPercent < expectedProgress - 10) status = "behind";
      }

      return {
        id: goal.id,
        name: goal.name || "Unnamed Goal",
        targetAmount,
        currentAmount,
        progressPercent,
        targetDate: targetDate?.toISOString().split("T")[0],
        monthlyContribution,
        projectedCompletionDate,
        status,
        daysRemaining,
        requiredMonthlySavings,
      };
    });

    // Sort by progress (lowest first to highlight goals needing attention)
    goalData.sort((a, b) => {
      // Completed goals last
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      // Behind goals first
      if (a.status === "behind" && b.status !== "behind") return -1;
      if (b.status === "behind" && a.status !== "behind") return 1;
      return a.progressPercent - b.progressPercent;
    });

    // Calculate aggregations
    const totalTargetAmount = goalData.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmount = goalData.reduce((sum, g) => sum + g.currentAmount, 0);
    const completedGoals = goalData.filter((g) => g.status === "completed").length;
    const behindGoals = goalData.filter((g) => g.status === "behind").length;

    const insights = this.generateInsights(goalData, totalTargetAmount, totalCurrentAmount);

    return {
      source: this.name,
      description: `${goalData.length} financial goals`,
      recordCount: goalData.length,
      data: goalData,
      aggregations: {
        totalTargetAmount,
        totalCurrentAmount,
        totalRemaining: totalTargetAmount - totalCurrentAmount,
        overallProgress: totalTargetAmount > 0
          ? ((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1)
          : "0",
        completedGoals,
        activeGoals: goalData.length - completedGoals,
        behindGoals,
        onTrackGoals: goalData.filter((g) => g.status === "on_track").length,
        aheadGoals: goalData.filter((g) => g.status === "ahead").length,
      },
      insights,
      schema: this.getSchema(),
    };
  }

  private generateInsights(
    goals: GoalData[],
    totalTarget: number,
    totalCurrent: number
  ): string[] {
    const insights: string[] = [];

    // Overall progress
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    insights.push(
      `Overall savings progress: ${overallProgress.toFixed(1)}% (${formatCurrency(totalCurrent)} of ${formatCurrency(totalTarget)})`
    );

    // Goals needing attention
    const behind = goals.filter((g) => g.status === "behind");
    if (behind.length > 0) {
      const behindNames = behind.map((g) => g.name).join(", ");
      insights.push(`⚠️ Goals falling behind: ${behindNames}`);
    }

    // Goals ahead of schedule
    const ahead = goals.filter((g) => g.status === "ahead");
    if (ahead.length > 0) {
      const aheadNames = ahead.map((g) => g.name).join(", ");
      insights.push(`✅ Goals ahead of schedule: ${aheadNames}`);
    }

    // Completed goals
    const completed = goals.filter((g) => g.status === "completed");
    if (completed.length > 0) {
      insights.push(`🎉 ${completed.length} goal(s) completed!`);
    }

    // Monthly savings recommendation
    const activeGoals = goals.filter((g) => g.status !== "completed");
    if (activeGoals.length > 0) {
      const totalRequiredMonthly = activeGoals.reduce(
        (sum, g) => sum + (g.requiredMonthlySavings || 0),
        0
      );
      if (totalRequiredMonthly > 0) {
        insights.push(
          `💡 Required monthly savings to meet all goals: ${formatCurrency(totalRequiredMonthly)}`
        );
      }
    }

    // Nearest deadline
    const upcomingDeadlines = goals
      .filter((g) => g.daysRemaining && g.daysRemaining > 0 && g.status !== "completed")
      .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
    
    if (upcomingDeadlines.length > 0) {
      const nearest = upcomingDeadlines[0];
      insights.push(
        `📅 Nearest deadline: "${nearest.name}" in ${nearest.daysRemaining} days (${nearest.progressPercent.toFixed(0)}% complete)`
      );
    }

    return insights;
  }

  getSchema(): SchemaMetadata {
    return {
      tableName: "goals",
      description: "Financial savings goals with target amounts, deadlines, and progress tracking",
      columns: [
        { name: "id", type: "uuid", description: "Unique goal identifier" },
        { name: "name", type: "varchar", description: "Goal name/description" },
        { name: "targetAmount", type: "decimal", description: "Target savings amount" },
        { name: "currentAmount", type: "decimal", description: "Current saved amount" },
        { name: "progressPercent", type: "decimal", description: "Progress towards goal (0-100)" },
        { name: "targetDate", type: "date", description: "Target completion date" },
        { name: "monthlyContribution", type: "decimal", description: "Average monthly savings rate" },
        { name: "projectedCompletionDate", type: "date", description: "Projected date based on current rate" },
        {
          name: "status",
          type: "varchar",
          description: "Goal status",
          sampleValues: ["on_track", "behind", "ahead", "completed"],
        },
        { name: "daysRemaining", type: "integer", description: "Days until target date" },
        { name: "requiredMonthlySavings", type: "decimal", description: "Monthly savings needed to meet goal" },
      ],
      relationships: [],
    };
  }

  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "goal_progress",
      "general_advice",
      "income_analysis",
    ];
    return relevantIntents.includes(intent);
  }
}
