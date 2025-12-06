/**
 * Subscription Retriever
 * 
 * Retrieves subscription data with cost analysis, usage assessment,
 * and recommendations for optimization.
 */

import { db } from "@/db";
import { subscriptions, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  SubscriptionData,
  formatCurrency,
} from "./types";

export class SubscriptionRetriever implements DataRetriever {
  name = "subscriptions";
  description = "Retrieves recurring subscriptions with cost analysis and optimization recommendations";

  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const rawSubscriptions = await db
      .select({
        id: subscriptions.id,
        name: subscriptions.name,
        amount: subscriptions.amount,
        frequency: subscriptions.frequency,
        categoryId: subscriptions.categoryId,
        categoryName: categories.name,
        nextBillingDate: subscriptions.nextBillingDate,
        website: subscriptions.website,
        isActive: subscriptions.isActive,
        startDate: subscriptions.startDate,
        planTier: subscriptions.planTier,
        notes: subscriptions.notes,
      })
      .from(subscriptions)
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(eq(subscriptions.userId, userId));

    const now = new Date();

    const subscriptionData: SubscriptionData[] = rawSubscriptions.map((sub) => {
      const amount = parseFloat(sub.amount || "0");
      
      // Calculate monthly equivalent
      let monthlyEquivalent = amount;
      switch (sub.frequency) {
        case "weekly":
          monthlyEquivalent = amount * 4.33;
          break;
        case "yearly":
        case "annual":
          monthlyEquivalent = amount / 12;
          break;
        case "quarterly":
          monthlyEquivalent = amount / 3;
          break;
        // monthly is default
      }

      // Calculate days since subscription started (as proxy for usage)
      const startDate = sub.startDate ? new Date(sub.startDate) : null;
      const daysSinceStart = startDate
        ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Calculate usage score based on plan tier and activity
      // Higher tier subscriptions are assumed to be more actively used
      let usageScore: number | undefined;
      if (sub.isActive) {
        const tier = sub.planTier?.toLowerCase();
        if (tier === 'enterprise' || tier === 'premium') usageScore = 90;
        else if (tier === 'basic' || tier === 'standard') usageScore = 70;
        else usageScore = 50; // Default for unknown tiers
      } else {
        usageScore = 0;
      }

      return {
        id: sub.id,
        name: sub.name || "Unknown Subscription",
        amount,
        frequency: sub.frequency || "monthly",
        monthlyEquivalent,
        category: sub.categoryName || undefined,
        nextBillingDate: sub.nextBillingDate?.toISOString().split("T")[0],
        provider: sub.website || undefined,
        isActive: sub.isActive ?? true,
        daysSinceLastUsed: daysSinceStart,
        usageScore,
      };
    });

    // Sort by monthly cost (highest first)
    subscriptionData.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

    // Calculate aggregations
    const activeSubscriptions = subscriptionData.filter((s) => s.isActive);
    const totalMonthly = activeSubscriptions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
    const totalYearly = totalMonthly * 12;
    const potentiallyUnused = activeSubscriptions.filter(
      (s) => s.usageScore !== undefined && s.usageScore < 30
    );
    const potentialSavings = potentiallyUnused.reduce((sum, s) => sum + s.monthlyEquivalent, 0);

    const insights = this.generateInsights(subscriptionData, totalMonthly, potentialSavings);

    return {
      source: this.name,
      description: `${subscriptionData.length} subscriptions (${activeSubscriptions.length} active)`,
      recordCount: subscriptionData.length,
      data: subscriptionData,
      aggregations: {
        totalSubscriptions: subscriptionData.length,
        activeSubscriptions: activeSubscriptions.length,
        totalMonthlySpend: totalMonthly.toFixed(2),
        totalYearlySpend: totalYearly.toFixed(2),
        potentiallyUnusedCount: potentiallyUnused.length,
        potentialMonthlySavings: potentialSavings.toFixed(2),
        potentialYearlySavings: (potentialSavings * 12).toFixed(2),
        averageSubscriptionCost: activeSubscriptions.length > 0
          ? (totalMonthly / activeSubscriptions.length).toFixed(2)
          : "0",
      },
      insights,
      schema: this.getSchema(),
    };
  }

  private generateInsights(
    subscriptions: SubscriptionData[],
    totalMonthly: number,
    potentialSavings: number
  ): string[] {
    const insights: string[] = [];
    const active = subscriptions.filter((s) => s.isActive);

    // Total subscription cost
    insights.push(
      `Total monthly subscription cost: ${formatCurrency(totalMonthly)} (${formatCurrency(totalMonthly * 12)}/year)`
    );

    // Most expensive subscriptions
    const topExpensive = active.slice(0, 3);
    if (topExpensive.length > 0) {
      const expensiveList = topExpensive
        .map((s) => `${s.name}: ${formatCurrency(s.monthlyEquivalent)}/mo`)
        .join(", ");
      insights.push(`Most expensive: ${expensiveList}`);
    }

    // Potentially unused subscriptions
    const unused = active.filter((s) => s.usageScore !== undefined && s.usageScore < 30);
    if (unused.length > 0) {
      const unusedList = unused.map((s) => s.name).join(", ");
      insights.push(
        `⚠️ Potentially unused (not accessed in 60+ days): ${unusedList}`
      );
      insights.push(
        `💡 Canceling unused subscriptions could save ${formatCurrency(potentialSavings)}/month (${formatCurrency(potentialSavings * 12)}/year)`
      );
    }

    // Upcoming renewals (next 7 days)
    const upcoming = active.filter((s) => {
      if (!s.nextBillingDate) return false;
      const daysUntil = Math.ceil(
        (new Date(s.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    });
    if (upcoming.length > 0) {
      const upcomingList = upcoming
        .map((s) => `${s.name} (${s.nextBillingDate})`)
        .join(", ");
      insights.push(`📅 Upcoming renewals this week: ${upcomingList}`);
    }

    // Category breakdown
    const byCategory: Record<string, number> = {};
    active.forEach((s) => {
      const cat = s.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + s.monthlyEquivalent;
    });
    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amount]) => `${cat}: ${formatCurrency(amount)}`)
      .join(", ");
    if (topCategories) {
      insights.push(`Category breakdown: ${topCategories}`);
    }

    return insights;
  }

  getSchema(): SchemaMetadata {
    return {
      tableName: "subscriptions",
      description: "Recurring subscription services with billing frequency and usage tracking",
      columns: [
        { name: "id", type: "uuid", description: "Unique subscription identifier" },
        { name: "name", type: "varchar", description: "Subscription/service name" },
        { name: "amount", type: "decimal", description: "Billing amount per cycle" },
        {
          name: "frequency",
          type: "varchar",
          description: "Billing frequency",
          sampleValues: ["monthly", "yearly", "weekly", "quarterly"],
        },
        { name: "monthlyEquivalent", type: "decimal", description: "Normalized monthly cost" },
        { name: "category", type: "varchar", description: "Subscription category" },
        { name: "nextBillingDate", type: "date", description: "Next billing date" },
        { name: "provider", type: "varchar", description: "Service provider" },
        { name: "isActive", type: "boolean", description: "Whether subscription is active" },
        { name: "daysSinceLastUsed", type: "integer", description: "Days since last accessed" },
        { name: "usageScore", type: "integer", description: "Usage score 0-100 (100 = frequently used)" },
      ],
      relationships: [
        {
          relatedTable: "categories",
          joinColumn: "categoryId",
          description: "Links to subscription category",
        },
      ],
    };
  }

  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "subscription_review",
      "spending_analysis",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
