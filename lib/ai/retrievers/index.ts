/**
 * Retriever Index
 * 
 * Central registry for all data retrievers in the RAG pipeline.
 * Provides factory functions and utility methods for retriever management.
 */

// Re-export all types
export * from "./types";

// Re-export all retrievers
export { TransactionRetriever } from "./transaction-retriever";
export { BudgetRetriever } from "./budget-retriever";
export { GoalRetriever } from "./goal-retriever";
export { SubscriptionRetriever } from "./subscription-retriever";
export { CreditCardRetriever } from "./credit-card-retriever";
export { TaxRetriever } from "./tax-retriever";
export { IncomeRetriever } from "./income-retriever";
export { ForecastRetriever } from "./forecast-retriever";

// Import for registry
import { TransactionRetriever } from "./transaction-retriever";
import { BudgetRetriever } from "./budget-retriever";
import { GoalRetriever } from "./goal-retriever";
import { SubscriptionRetriever } from "./subscription-retriever";
import { CreditCardRetriever } from "./credit-card-retriever";
import { TaxRetriever } from "./tax-retriever";
import { IncomeRetriever } from "./income-retriever";
import { ForecastRetriever } from "./forecast-retriever";
import { DataRetriever, QueryIntent } from "./types";

/**
 * Retriever registry type
 */
export type RetrieverName =
  | "transactions"
  | "budgets"
  | "goals"
  | "subscriptions"
  | "credit_cards"
  | "tax"
  | "income"
  | "forecasts";

/**
 * Retriever registry - singleton instances
 */
const retrieverRegistry: Record<RetrieverName, DataRetriever> = {
  transactions: new TransactionRetriever(),
  budgets: new BudgetRetriever(),
  goals: new GoalRetriever(),
  subscriptions: new SubscriptionRetriever(),
  credit_cards: new CreditCardRetriever(),
  tax: new TaxRetriever(),
  income: new IncomeRetriever(),
  forecasts: new ForecastRetriever(),
};

/**
 * Get a retriever by name
 */
export function getRetriever(name: RetrieverName): DataRetriever {
  const retriever = retrieverRegistry[name];
  if (!retriever) {
    throw new Error(`Unknown retriever: ${name}`);
  }
  return retriever;
}

/**
 * Get all retriever names
 */
export function getRetrieverNames(): RetrieverName[] {
  return Object.keys(retrieverRegistry) as RetrieverName[];
}

/**
 * Get all retrievers
 */
export function getAllRetrievers(): DataRetriever[] {
  return Object.values(retrieverRegistry);
}

/**
 * Get retrievers relevant for a specific intent
 */
export function getRetrieversForIntent(intent: QueryIntent): DataRetriever[] {
  return getAllRetrievers().filter((retriever) => retriever.isRelevantFor(intent));
}

/**
 * Get retriever names relevant for a specific intent
 */
export function getRetrieverNamesForIntent(intent: QueryIntent): RetrieverName[] {
  return getRetrieverNames().filter((name) => 
    retrieverRegistry[name].isRelevantFor(intent)
  );
}

/**
 * Mapping from data access permission keys to retriever names
 */
export const DATA_ACCESS_TO_RETRIEVER: Record<string, RetrieverName[]> = {
  transactions: ["transactions"],
  budgets: ["budgets"],
  goals: ["goals"],
  subscriptions: ["subscriptions"],
  creditCards: ["credit_cards"],
  taxData: ["tax"],
  income: ["income"],
  forecasts: ["forecasts"],
};

/**
 * Filter retrievers by data access permissions
 */
export function filterRetrieversByPermissions(
  retrieverNames: RetrieverName[],
  permissions: Record<string, boolean>
): RetrieverName[] {
  return retrieverNames.filter((name) => {
    // Find which permission controls this retriever
    for (const [permKey, retrieverList] of Object.entries(DATA_ACCESS_TO_RETRIEVER)) {
      if (retrieverList.includes(name)) {
        // Check if permission is explicitly denied
        if (permissions[permKey] === false) {
          return false;
        }
      }
    }
    return true;
  });
}

/**
 * Retriever metadata for UI display
 */
export const RETRIEVER_METADATA: Record<RetrieverName, {
  displayName: string;
  description: string;
  icon: string;
  color: string;
}> = {
  transactions: {
    displayName: "Transactions",
    description: "Spending and income transaction history",
    icon: "💳",
    color: "#8B5CF6",
  },
  budgets: {
    displayName: "Budgets",
    description: "Budget allocations and utilization",
    icon: "📊",
    color: "#10B981",
  },
  goals: {
    displayName: "Goals",
    description: "Financial goals and progress",
    icon: "🎯",
    color: "#F59E0B",
  },
  subscriptions: {
    displayName: "Subscriptions",
    description: "Recurring subscriptions and services",
    icon: "🔄",
    color: "#EF4444",
  },
  credit_cards: {
    displayName: "Credit Cards",
    description: "Credit card usage and limits",
    icon: "💳",
    color: "#3B82F6",
  },
  tax: {
    displayName: "Tax Data",
    description: "Tax deductions and LHDN reliefs",
    icon: "📋",
    color: "#6366F1",
  },
  income: {
    displayName: "Income",
    description: "Income sources and trends",
    icon: "💰",
    color: "#22C55E",
  },
  forecasts: {
    displayName: "Forecasts",
    description: "Spending predictions and patterns",
    icon: "📈",
    color: "#A855F7",
  },
};

/**
 * Intent metadata for UI display
 */
export const INTENT_METADATA: Record<QueryIntent, {
  displayName: string;
  description: string;
  suggestedPrompts: string[];
}> = {
  tax_optimization: {
    displayName: "Tax Optimization",
    description: "Maximize tax savings and reliefs",
    suggestedPrompts: [
      "How can I maximize my tax deductions this year?",
      "What tax reliefs am I missing?",
      "Am I going to get a tax refund?",
    ],
  },
  spending_analysis: {
    displayName: "Spending Analysis",
    description: "Understand your spending patterns",
    suggestedPrompts: [
      "Where am I spending the most money?",
      "What are my top expenses this month?",
      "How has my spending changed over time?",
    ],
  },
  budget_review: {
    displayName: "Budget Review",
    description: "Check budget status and utilization",
    suggestedPrompts: [
      "Am I staying within budget?",
      "Which categories are over budget?",
      "How can I improve my budget adherence?",
    ],
  },
  goal_progress: {
    displayName: "Goal Progress",
    description: "Track progress towards financial goals",
    suggestedPrompts: [
      "How am I doing on my savings goals?",
      "When will I reach my goal?",
      "How much more do I need to save?",
    ],
  },
  subscription_review: {
    displayName: "Subscription Audit",
    description: "Review and optimize subscriptions",
    suggestedPrompts: [
      "Which subscriptions can I cancel?",
      "How much am I spending on subscriptions?",
      "Are there any unused subscriptions?",
    ],
  },
  credit_card_advice: {
    displayName: "Credit Card Advice",
    description: "Optimize credit card usage",
    suggestedPrompts: [
      "Which card should I use for shopping?",
      "What's my credit utilization?",
      "When are my card payments due?",
    ],
  },
  income_analysis: {
    displayName: "Income Analysis",
    description: "Analyze income sources and trends",
    suggestedPrompts: [
      "What's my total income this year?",
      "How is my income trending?",
      "What's my savings rate?",
    ],
  },
  forecast_review: {
    displayName: "Spending Forecast",
    description: "View spending predictions",
    suggestedPrompts: [
      "What will I spend next month?",
      "Am I on track for the month?",
      "Which categories will exceed budget?",
    ],
  },
  comparison: {
    displayName: "Comparison",
    description: "Compare periods and trends",
    suggestedPrompts: [
      "How does this month compare to last?",
      "What's my year-over-year change?",
      "Is my spending increasing or decreasing?",
    ],
  },
  anomaly_detection: {
    displayName: "Anomaly Detection",
    description: "Find unusual transactions",
    suggestedPrompts: [
      "Are there any unusual transactions?",
      "Do you see anything suspicious?",
      "What's my biggest unexpected expense?",
    ],
  },
  general_advice: {
    displayName: "General Advice",
    description: "Get financial guidance",
    suggestedPrompts: [
      "How can I improve my finances?",
      "What should I focus on?",
      "Give me a financial health summary",
    ],
  },
};

/**
 * Get suggested prompts for an intent
 */
export function getSuggestedPrompts(intent: QueryIntent): string[] {
  return INTENT_METADATA[intent]?.suggestedPrompts || [];
}

/**
 * Get all suggested prompts across all intents
 */
export function getAllSuggestedPrompts(): { intent: QueryIntent; prompts: string[] }[] {
  return Object.entries(INTENT_METADATA).map(([intent, metadata]) => ({
    intent: intent as QueryIntent,
    prompts: metadata.suggestedPrompts,
  }));
}
