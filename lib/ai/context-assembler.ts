/**
 * Context Assembler
 * 
 * Orchestrates data retrieval from multiple retrievers and assembles
 * a comprehensive context for LLM consumption. Handles:
 * - Parallel retrieval from relevant data sources
 * - Data deduplication and merging
 * - Token budget management
 * - Summary generation for efficient context
 */

import {
  QueryAnalysis,
  QueryIntent,
  RetrievedData,
  AssembledContext,
  DateRange,
  getDateRangePreset,
  formatCurrency,
  estimateTokens,
} from "./retrievers/types";
import { TransactionRetriever } from "./retrievers/transaction-retriever";
import { BudgetRetriever } from "./retrievers/budget-retriever";
import { GoalRetriever } from "./retrievers/goal-retriever";
import { SubscriptionRetriever } from "./retrievers/subscription-retriever";
import { CreditCardRetriever } from "./retrievers/credit-card-retriever";
import { TaxRetriever } from "./retrievers/tax-retriever";
import { IncomeRetriever } from "./retrievers/income-retriever";
import { ForecastRetriever } from "./retrievers/forecast-retriever";

// Maximum tokens to allocate for context
const MAX_CONTEXT_TOKENS = 8000;
const TOKEN_BUFFER = 500;

// Retriever priority by intent (higher = more important)
const RETRIEVER_PRIORITIES: Record<QueryIntent, Record<string, number>> = {
  tax_optimization: {
    tax: 10,
    transactions: 8,
    income: 7,
    budgets: 3,
    goals: 2,
  },
  spending_analysis: {
    transactions: 10,
    budgets: 8,
    forecasts: 6,
    subscriptions: 5,
    credit_cards: 4,
  },
  budget_review: {
    budgets: 10,
    transactions: 9,
    goals: 5,
    forecasts: 4,
  },
  goal_progress: {
    goals: 10,
    transactions: 7,
    income: 6,
    budgets: 5,
  },
  subscription_review: {
    subscriptions: 10,
    transactions: 7,
    budgets: 5,
  },
  credit_card_advice: {
    credit_cards: 10,
    transactions: 8,
    budgets: 4,
  },
  income_analysis: {
    income: 10,
    transactions: 7,
    tax: 6,
    goals: 4,
  },
  forecast_review: {
    forecasts: 10,
    transactions: 8,
    budgets: 7,
    subscriptions: 5,
  },
  comparison: {
    transactions: 10,
    budgets: 8,
    income: 7,
    forecasts: 6,
  },
  anomaly_detection: {
    transactions: 10,
    forecasts: 8,
    credit_cards: 5,
  },
  general_advice: {
    transactions: 8,
    budgets: 7,
    goals: 6,
    income: 5,
    subscriptions: 4,
    credit_cards: 3,
    tax: 3,
    forecasts: 3,
  },
};

// Retriever instances
const retrievers = {
  transactions: new TransactionRetriever(),
  budgets: new BudgetRetriever(),
  goals: new GoalRetriever(),
  subscriptions: new SubscriptionRetriever(),
  credit_cards: new CreditCardRetriever(),
  tax: new TaxRetriever(),
  income: new IncomeRetriever(),
  forecasts: new ForecastRetriever(),
};

type RetrieverKey = keyof typeof retrievers;

/**
 * Assemble context from multiple retrievers based on query analysis
 */
export async function assembleContext(
  userId: string,
  queryAnalysis: QueryAnalysis,
  dataAccessPermissions?: Record<string, boolean>
): Promise<AssembledContext> {
  const startTime = Date.now();
  
  // Determine which retrievers to use based on intent and permissions
  const selectedRetrievers = selectRetrievers(
    queryAnalysis.intent,
    queryAnalysis.suggestedRetrievers,
    dataAccessPermissions
  );
  
  // Determine date range from entities or use default
  const dateRange = queryAnalysis.entities.dateRange || getDateRangePreset("this_month");
  
  // Build retrieval options
  const retrievalOptions = {
    dateRange,
    limit: calculateLimit(selectedRetrievers.length),
    categoryIds: queryAnalysis.entities.categories,
    minAmount: queryAnalysis.entities.amounts?.min,
    maxAmount: queryAnalysis.entities.amounts?.max,
    includeMetadata: true,
  };
  
  // Execute retrievers in parallel
  const retrievalPromises = selectedRetrievers.map(async (retrieverKey) => {
    try {
      const retriever = retrievers[retrieverKey as RetrieverKey];
      if (!retriever) return null;
      
      const data = await retriever.retrieve(
        userId,
        queryAnalysis.normalizedQuery,
        retrievalOptions
      );
      
      return { key: retrieverKey, data };
    } catch (error) {
      console.error(`Error in ${retrieverKey} retriever:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(retrievalPromises);
  
  // Filter out failed retrievals and sort by priority
  const validResults = results
    .filter((r): r is { key: string; data: RetrievedData } => r !== null)
    .sort((a, b) => {
      const priorities = RETRIEVER_PRIORITIES[queryAnalysis.intent] || {};
      return (priorities[b.key] || 0) - (priorities[a.key] || 0);
    });
  
  // Collect all retrieved data
  const relevantData: RetrievedData[] = validResults.map((r) => r.data);
  
  // Calculate total records
  const totalRecords = relevantData.reduce((sum, d) => sum + d.recordCount, 0);
  
  // Generate summaries
  const summaries = generateSummaries(relevantData, queryAnalysis);
  
  // Trim data if exceeding token budget
  const trimmedData = trimDataToTokenBudget(relevantData, MAX_CONTEXT_TOKENS - TOKEN_BUFFER);
  
  // Calculate processing time
  const processingTimeMs = Date.now() - startTime;
  
  // Estimate tokens
  const tokenEstimate = estimateContextTokens(trimmedData, summaries);
  
  return {
    query: queryAnalysis.originalQuery,
    intent: queryAnalysis.intent,
    relevantData: trimmedData,
    totalRecords,
    dateRange,
    summaries,
    userContext: {
      currency: "MYR",
      locale: "en-MY",
      fiscalYear: new Date().getFullYear(),
    },
    metadata: {
      retrieversUsed: validResults.map((r) => r.key),
      processingTimeMs,
      tokenEstimate,
    },
  };
}

/**
 * Select retrievers based on intent and permissions
 */
function selectRetrievers(
  intent: QueryIntent,
  suggestedRetrievers: string[],
  permissions?: Record<string, boolean>
): string[] {
  // Start with suggested retrievers
  let selected = [...suggestedRetrievers];
  
  // Add intent-specific retrievers that aren't in the list
  const intentPriorities = RETRIEVER_PRIORITIES[intent] || {};
  const prioritizedRetrievers = Object.entries(intentPriorities)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key);
  
  for (const retriever of prioritizedRetrievers) {
    if (!selected.includes(retriever)) {
      selected.push(retriever);
    }
  }
  
  // Filter by permissions
  if (permissions) {
    const permissionMap: Record<string, string> = {
      transactions: "transactions",
      budgets: "budgets",
      goals: "goals",
      subscriptions: "subscriptions",
      credit_cards: "creditCards",
      tax: "taxData",
      income: "income",
      forecasts: "forecasts",
    };
    
    selected = selected.filter((r) => {
      const permKey = permissionMap[r];
      return permKey ? permissions[permKey] !== false : true;
    });
  }
  
  // Limit to top 5 retrievers
  return selected.slice(0, 5);
}

/**
 * Calculate retrieval limit based on number of retrievers
 */
function calculateLimit(retrieverCount: number): number {
  // Fewer retrievers = more data per retriever
  const baseLimit = 100;
  return Math.floor(baseLimit / Math.max(1, retrieverCount / 2));
}

/**
 * Generate summaries from retrieved data
 */
function generateSummaries(
  data: RetrievedData[],
  queryAnalysis: QueryAnalysis
): AssembledContext["summaries"] {
  const allInsights: string[] = [];
  const allRecommendations: string[] = [];
  let financialSummary = "";
  
  // Collect insights from all sources
  data.forEach((source) => {
    if (source.insights) {
      allInsights.push(...source.insights);
    }
  });
  
  // Generate financial summary based on intent
  switch (queryAnalysis.intent) {
    case "tax_optimization": {
      const taxData = data.find((d) => d.source === "tax");
      if (taxData?.aggregations) {
        financialSummary = `Tax Year: YA ${taxData.aggregations.taxYear}. ` +
          `Annual Income: ${taxData.aggregations.annualIncome}. ` +
          `Reliefs Claimed: ${taxData.aggregations.totalReliefsClaimed}. ` +
          `Tax Bracket: ${taxData.aggregations.estimatedTaxBracket}. ` +
          `Projected: ${taxData.aggregations.projectedRefundOrOwed}. ` +
          `Potential Additional Savings: ${taxData.aggregations.potentialAdditionalSavings}.`;
      }
      break;
    }
    case "spending_analysis": {
      const txData = data.find((d) => d.source === "transactions");
      if (txData?.aggregations) {
        financialSummary = `Period: ${txData.dateRange?.label || "Current Month"}. ` +
          `Total Expenses: ${txData.aggregations.totalExpenses}. ` +
          `Net Cash Flow: ${txData.aggregations.netCashFlow}. ` +
          `Trend: ${txData.aggregations.expensesTrend}. ` +
          `Change from Last Period: ${txData.aggregations.percentChangeFromLastPeriod}%.`;
      }
      break;
    }
    case "budget_review": {
      const budgetData = data.find((d) => d.source === "budgets");
      if (budgetData?.aggregations) {
        financialSummary = `Budgets: ${budgetData.aggregations.totalBudgets || budgetData.recordCount}. ` +
          `Overall Utilization: ${budgetData.aggregations.overallUtilization || "N/A"}. ` +
          `Over Budget: ${budgetData.aggregations.overBudgetCount || 0}. ` +
          `Under Budget: ${budgetData.aggregations.underBudgetCount || 0}.`;
      }
      break;
    }
    case "goal_progress": {
      const goalData = data.find((d) => d.source === "goals");
      if (goalData?.aggregations) {
        financialSummary = `Goals: ${goalData.aggregations.totalGoals || goalData.recordCount}. ` +
          `Overall Progress: ${goalData.aggregations.overallProgress || "N/A"}. ` +
          `On Track: ${goalData.aggregations.onTrackCount || 0}. ` +
          `Completed: ${goalData.aggregations.completedCount || 0}.`;
      }
      break;
    }
    case "credit_card_advice": {
      const ccData = data.find((d) => d.source === "credit_cards");
      if (ccData?.aggregations) {
        financialSummary = `Cards: ${ccData.aggregations.totalCards}. ` +
          `Total Limit: ${ccData.aggregations.totalCreditLimit}. ` +
          `Current Balance: ${ccData.aggregations.totalBalance}. ` +
          `Utilization: ${ccData.aggregations.overallUtilization}. ` +
          `Monthly Spending: ${ccData.aggregations.totalMonthlySpending}.`;
      }
      break;
    }
    case "income_analysis": {
      const incomeData = data.find((d) => d.source === "income");
      if (incomeData?.aggregations) {
        financialSummary = `Total Income: ${incomeData.aggregations.totalIncome}. ` +
          `Monthly Average: ${incomeData.aggregations.avgMonthlyIncome}. ` +
          `Savings Rate: ${incomeData.aggregations.savingsRate}. ` +
          `Stability: ${incomeData.aggregations.incomeStability}. ` +
          `YoY Change: ${incomeData.aggregations.yearOverYearChange}.`;
      }
      break;
    }
    case "forecast_review": {
      const forecastData = data.find((d) => d.source === "forecasts");
      if (forecastData?.aggregations) {
        financialSummary = `Trend: ${forecastData.aggregations.overallTrend}. ` +
          `Current Month Projection: ${forecastData.aggregations.currentMonthProjection}. ` +
          `Daily Rate: ${forecastData.aggregations.dailySpendingRate}. ` +
          `Confidence: ${forecastData.aggregations.confidenceScore}.`;
      }
      break;
    }
    default: {
      // General summary from transactions
      const txData = data.find((d) => d.source === "transactions");
      if (txData?.aggregations) {
        financialSummary = `Expenses: ${txData.aggregations.totalExpenses}. ` +
          `Income: ${txData.aggregations.totalIncome || "N/A"}. ` +
          `Net: ${txData.aggregations.netCashFlow}.`;
      }
    }
  }
  
  // Generate recommendations based on insights
  allInsights.forEach((insight) => {
    if (insight.includes("⚠️") || insight.includes("🚨")) {
      // Convert warnings to recommendations
      const recommendation = insight
        .replace("⚠️", "Consider:")
        .replace("🚨", "Action needed:");
      allRecommendations.push(recommendation);
    } else if (insight.includes("💡")) {
      allRecommendations.push(insight.replace("💡", "Tip:"));
    }
  });
  
  return {
    financial: financialSummary,
    insights: allInsights.slice(0, 10), // Limit to top 10 insights
    recommendations: allRecommendations.slice(0, 5), // Limit to top 5 recommendations
  };
}

/**
 * Trim data to fit within token budget
 */
function trimDataToTokenBudget(
  data: RetrievedData[],
  maxTokens: number
): RetrievedData[] {
  let currentTokens = 0;
  const trimmedData: RetrievedData[] = [];
  
  for (const source of data) {
    // Estimate tokens for this source
    const sourceTokens = estimateTokens(JSON.stringify(source));
    
    if (currentTokens + sourceTokens <= maxTokens) {
      trimmedData.push(source);
      currentTokens += sourceTokens;
    } else {
      // Try to include a trimmed version
      const remainingBudget = maxTokens - currentTokens;
      if (remainingBudget > 500) {
        // Include summary only
        const trimmedSource: RetrievedData = {
          source: source.source,
          description: source.description,
          recordCount: source.recordCount,
          dateRange: source.dateRange,
          data: [], // Empty data, rely on aggregations
          aggregations: source.aggregations,
          insights: source.insights?.slice(0, 3),
        };
        trimmedData.push(trimmedSource);
        break;
      }
    }
  }
  
  return trimmedData;
}

/**
 * Estimate total tokens for context
 */
function estimateContextTokens(
  data: RetrievedData[],
  summaries: AssembledContext["summaries"]
): number {
  let tokens = 0;
  
  // Data tokens
  tokens += estimateTokens(JSON.stringify(data));
  
  // Summary tokens
  tokens += estimateTokens(summaries.financial);
  tokens += estimateTokens(summaries.insights.join(" "));
  tokens += estimateTokens(summaries.recommendations.join(" "));
  
  return tokens;
}

/**
 * Format context for LLM consumption
 */
export function formatContextForLLM(context: AssembledContext): string {
  const sections: string[] = [];
  
  // Query and intent
  sections.push(`## User Query\n${context.query}`);
  sections.push(`## Detected Intent\n${context.intent.replace(/_/g, " ").toUpperCase()}`);
  
  // Financial summary
  if (context.summaries.financial) {
    sections.push(`## Financial Summary\n${context.summaries.financial}`);
  }
  
  // Key insights
  if (context.summaries.insights.length > 0) {
    sections.push(`## Key Insights\n${context.summaries.insights.map(i => `- ${i}`).join("\n")}`);
  }
  
  // Recommendations
  if (context.summaries.recommendations.length > 0) {
    sections.push(`## Recommendations\n${context.summaries.recommendations.map(r => `- ${r}`).join("\n")}`);
  }
  
  // Data sources
  sections.push(`## Data Sources\n${context.metadata.retrieversUsed.join(", ")}`);
  sections.push(`## Date Range\n${context.dateRange.label || `${context.dateRange.start.toDateString()} to ${context.dateRange.end.toDateString()}`}`);
  
  // Include relevant aggregations
  context.relevantData.forEach((source) => {
    if (source.aggregations && Object.keys(source.aggregations).length > 0) {
      const aggSection = Object.entries(source.aggregations)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n");
      sections.push(`## ${source.source.toUpperCase()} Data\n${aggSection}`);
    }
  });
  
  return sections.join("\n\n");
}

/**
 * Merge contexts from multiple queries (for multi-turn conversations)
 */
export function mergeContexts(
  previousContext: AssembledContext | null,
  newContext: AssembledContext
): AssembledContext {
  if (!previousContext) return newContext;
  
  // Merge relevant data (avoid duplicates)
  const mergedData = [...previousContext.relevantData];
  newContext.relevantData.forEach((newSource) => {
    const existing = mergedData.findIndex((d) => d.source === newSource.source);
    if (existing >= 0) {
      // Replace with newer data
      mergedData[existing] = newSource;
    } else {
      mergedData.push(newSource);
    }
  });
  
  // Merge insights
  const mergedInsights = [
    ...new Set([
      ...previousContext.summaries.insights,
      ...newContext.summaries.insights,
    ]),
  ].slice(0, 15);
  
  return {
    ...newContext,
    relevantData: mergedData,
    summaries: {
      ...newContext.summaries,
      insights: mergedInsights,
    },
    totalRecords: previousContext.totalRecords + newContext.totalRecords,
  };
}
