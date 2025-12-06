/**
 * AI Retriever Types
 * 
 * Defines the interfaces and types for the RAG retrieval system.
 * Based on best practices for structured data RAG:
 * - Metadata extraction for schema understanding
 * - Sample data for context grounding
 * - Entity relationships for multi-table queries
 */

// ============================================
// CORE TYPES
// ============================================

/**
 * Query intent classification for routing to appropriate retrievers
 */
export type QueryIntent =
  | 'tax_optimization'      // Tax savings, deductions, LHDN relief
  | 'spending_analysis'     // Spending patterns, overspending, trends
  | 'budget_review'         // Budget status, utilization, recommendations
  | 'goal_progress'         // Goal tracking, projections, savings rate
  | 'subscription_review'   // Subscription audit, unused services
  | 'credit_card_advice'    // Card usage, utilization, rewards
  | 'income_analysis'       // Income trends, sources, projections
  | 'forecast_review'       // Spending forecasts, predictions
  | 'general_advice'        // General financial advice
  | 'comparison'            // Month-over-month, year-over-year comparisons
  | 'anomaly_detection';    // Unusual transactions, spending spikes

/**
 * Time range for data retrieval
 */
export interface DateRange {
  start: Date;
  end: Date;
  label?: string; // e.g., "November 2024", "Q4 2024", "This Year"
}

/**
 * Common retrieval options
 */
export interface RetrievalOptions {
  dateRange?: DateRange;
  limit?: number;
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  includeMetadata?: boolean;
  anonymize?: boolean; // Anonymize vendor names for privacy
}

/**
 * Schema metadata for a data source
 */
export interface SchemaMetadata {
  tableName: string;
  description: string;
  columns: {
    name: string;
    type: string;
    description: string;
    sampleValues?: string[];
  }[];
  relationships: {
    relatedTable: string;
    joinColumn: string;
    description: string;
  }[];
}

/**
 * Retrieved data with metadata for transparency
 */
export interface RetrievedData {
  source: string;           // e.g., "transactions", "budgets"
  description: string;      // Human-readable description
  recordCount: number;
  dateRange?: DateRange;
  data: any[];              // The actual data
  aggregations?: Record<string, number | string>; // Computed aggregations
  insights?: string[];      // Pre-computed insights about the data
  schema?: SchemaMetadata;  // Schema info for LLM understanding
  relevanceScore?: number;  // How relevant this data is to the query
}

/**
 * Aggregation types for financial data
 */
export interface FinancialAggregation {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
  byCategory?: Record<string, number>;
  byMonth?: Record<string, number>;
  byPaymentMethod?: Record<string, number>;
  trend?: 'increasing' | 'decreasing' | 'stable';
  percentChange?: number;
}

/**
 * Base interface for all retrievers
 */
export interface DataRetriever {
  name: string;
  description: string;
  
  /**
   * Retrieve data based on query and options
   */
  retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData>;
  
  /**
   * Get schema metadata for this retriever
   */
  getSchema(): SchemaMetadata;
  
  /**
   * Check if this retriever is relevant for the given intent
   */
  isRelevantFor(intent: QueryIntent): boolean;
}

// ============================================
// SPECIFIC DATA TYPES
// ============================================

/**
 * Transaction data for retrieval
 */
export interface TransactionData {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  categoryIcon?: string;
  vendor?: string;
  paymentMethod?: string;
  creditCardName?: string;
  isTaxDeductible?: boolean;
  taxCategory?: string;
  notes?: string;
}

/**
 * Budget data for retrieval
 */
export interface BudgetData {
  id: string;
  category: string;
  categoryIcon?: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  period: string;
  status: 'under' | 'warning' | 'over';
  daysRemaining?: number;
  projectedOverspend?: number;
}

/**
 * Goal data for retrieval
 */
export interface GoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  targetDate?: string;
  monthlyContribution?: number;
  projectedCompletionDate?: string;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
  daysRemaining?: number;
  requiredMonthlySavings?: number;
}

/**
 * Subscription data for retrieval
 */
export interface SubscriptionData {
  id: string;
  name: string;
  amount: number;
  frequency: string; // monthly, yearly, etc.
  monthlyEquivalent: number;
  category?: string;
  nextBillingDate?: string;
  provider?: string;
  isActive: boolean;
  daysSinceLastUsed?: number;
  usageScore?: number; // 0-100, how often used
}

/**
 * Credit card data for retrieval
 */
export interface CreditCardData {
  id: string;
  bankName: string;
  cardName: string;
  cardType: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  utilizationPercent: number;
  paymentDueDay?: number;
  daysUntilDue?: number;
  monthlySpending: number;
  topCategories?: { category: string; amount: number }[];
  rewardsType?: string;
}

/**
 * Tax deduction data for retrieval
 */
export interface TaxDeductionData {
  id: string;
  category: string;
  categoryCode: string; // LHDN code
  claimableAmount: number;
  maxLimit: number;
  remainingLimit: number;
  utilizationPercent: number;
  eligibleTransactions: number;
  potentialSavings: number; // Based on tax bracket
  description: string;
  requirements?: string[];
}

/**
 * Income data for retrieval
 */
export interface IncomeData {
  id: string;
  source: string;
  type: 'salary' | 'bonus' | 'freelance' | 'investment' | 'commission' | 'other';
  amount: number;
  date: string;
  frequency?: string;
  isRecurring: boolean;
  month?: number;
  year?: number;
}

/**
 * Forecast data for retrieval
 */
export interface ForecastData {
  month: string;
  predictedExpenses: number;
  predictedIncome: number;
  confidence: number;
  topExpenseCategories: { category: string; amount: number }[];
  alerts?: string[];
}

// ============================================
// CONTEXT ASSEMBLY TYPES
// ============================================

/**
 * Assembled context for LLM
 */
export interface AssembledContext {
  query: string;
  intent: QueryIntent;
  relevantData: RetrievedData[];
  totalRecords: number;
  dateRange: DateRange;
  
  // Pre-computed summaries for token efficiency
  summaries: {
    financial: string;       // Overall financial summary
    insights: string[];      // Key insights
    recommendations: string[]; // Suggested actions
  };
  
  // User context
  userContext: {
    currency: string;
    locale: string;
    fiscalYear?: number;
  };
  
  // Metadata for transparency
  metadata: {
    retrieversUsed: string[];
    processingTimeMs: number;
    tokenEstimate: number;
  };
}

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  originalQuery: string;
  normalizedQuery: string;
  intent: QueryIntent;
  confidence: number;
  
  // Extracted entities
  entities: {
    dateRange?: DateRange;
    categories?: string[];
    amounts?: { min?: number; max?: number };
    vendors?: string[];
    timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    comparison?: boolean;
  };
  
  // Suggested retrievers
  suggestedRetrievers: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get date range presets
 */
export function getDateRangePreset(
  preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'ytd'
): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (preset) {
    case 'today':
      return {
        start: new Date(year, month, now.getDate()),
        end: now,
        label: 'Today',
      };
    case 'this_week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return {
        start: weekStart,
        end: now,
        label: 'This Week',
      };
    case 'this_month':
      return {
        start: new Date(year, month, 1),
        end: now,
        label: new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      };
    case 'last_month':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0),
        label: new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
      };
    case 'this_quarter':
      const quarterStart = new Date(year, Math.floor(month / 3) * 3, 1);
      return {
        start: quarterStart,
        end: now,
        label: `Q${Math.floor(month / 3) + 1} ${year}`,
      };
    case 'this_year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
        label: year.toString(),
      };
    case 'last_year':
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31),
        label: (year - 1).toString(),
      };
    case 'ytd':
      return {
        start: new Date(year, 0, 1),
        end: now,
        label: `YTD ${year}`,
      };
    default:
      return {
        start: new Date(year, month, 1),
        end: now,
        label: 'This Month',
      };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'MYR'): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}
