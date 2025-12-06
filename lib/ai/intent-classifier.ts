/**
 * Intent Classifier
 * 
 * Classifies user queries into specific intents for intelligent routing.
 * Uses keyword matching, entity extraction, and pattern recognition
 * to determine the best retrieval strategy.
 * 
 * This is a lightweight, zero-dependency classifier that can work
 * without LLM calls for common queries, improving response time.
 */

import {
  QueryIntent,
  QueryAnalysis,
  DateRange,
  getDateRangePreset,
} from "./retrievers/types";

// Intent patterns with keywords and phrases
const INTENT_PATTERNS: Record<QueryIntent, {
  keywords: string[];
  phrases: string[];
  weight: number;
}> = {
  tax_optimization: {
    keywords: [
      "tax", "lhdn", "relief", "deduction", "pcb", "claim", "filing",
      "refund", "assessment", "ya", "cukai", "pelepasan", "rebate",
      "epf", "kwsp", "socso", "perkeso", "eis", "zakat", "education relief",
      "medical relief", "insurance relief", "lifestyle relief"
    ],
    phrases: [
      "save on tax", "tax savings", "maximize deductions", "tax return",
      "how much tax", "reduce tax", "tax-deductible", "claim relief",
      "tax bracket", "income tax", "annual assessment"
    ],
    weight: 1.5,
  },
  spending_analysis: {
    keywords: [
      "spending", "spent", "expense", "expenses", "where", "money",
      "category", "breakdown", "pattern", "trend", "overspend",
      "perbelanjaan", "belanja", "habis", "duit"
    ],
    phrases: [
      "where did", "how much did i spend", "spending too much",
      "top expenses", "biggest expense", "money going", "spending habits",
      "spending pattern", "analyze spending", "review expenses"
    ],
    weight: 1.2,
  },
  budget_review: {
    keywords: [
      "budget", "limit", "allocation", "over", "under", "within",
      "bajet", "allocate", "allowance", "cap", "threshold"
    ],
    phrases: [
      "on track", "over budget", "under budget", "budget status",
      "how is my budget", "budget utilization", "set budget",
      "budget vs actual", "staying within budget"
    ],
    weight: 1.2,
  },
  goal_progress: {
    keywords: [
      "goal", "goals", "target", "saving", "savings", "progress",
      "matlamat", "simpanan", "achieve", "reach", "milestone"
    ],
    phrases: [
      "on track", "how am i doing", "goal progress", "reach my goal",
      "savings goal", "achieve my", "when will i", "how long until",
      "target amount", "save for"
    ],
    weight: 1.3,
  },
  subscription_review: {
    keywords: [
      "subscription", "subscriptions", "recurring", "monthly", "cancel",
      "langganan", "netflix", "spotify", "gym", "membership", "service"
    ],
    phrases: [
      "cancel subscription", "unused subscription", "too many subscriptions",
      "subscription audit", "how much on subscriptions", "recurring payments",
      "wasting money on", "not using"
    ],
    weight: 1.3,
  },
  credit_card_advice: {
    keywords: [
      "credit", "card", "credit card", "utilization", "limit", "payment",
      "due", "balance", "cashback", "rewards", "points", "miles",
      "visa", "mastercard", "amex"
    ],
    phrases: [
      "credit card", "best card", "card to use", "credit utilization",
      "pay off card", "credit limit", "which card", "card rewards",
      "card payment due", "credit score"
    ],
    weight: 1.4,
  },
  income_analysis: {
    keywords: [
      "income", "salary", "earning", "earned", "bonus", "freelance",
      "pendapatan", "gaji", "commission", "revenue", "paycheck"
    ],
    phrases: [
      "how much am i earning", "income trend", "salary increase",
      "total income", "income sources", "making enough", "income vs expense",
      "net income", "gross income"
    ],
    weight: 1.2,
  },
  forecast_review: {
    keywords: [
      "forecast", "predict", "prediction", "future", "next month",
      "projection", "expect", "estimate", "anticipate"
    ],
    phrases: [
      "what will i spend", "next month spending", "projected expenses",
      "how much will", "spending forecast", "predict my", "future spending",
      "end of month", "expecting to spend"
    ],
    weight: 1.3,
  },
  comparison: {
    keywords: [
      "compare", "comparison", "versus", "vs", "difference", "between",
      "more", "less", "higher", "lower", "increase", "decrease"
    ],
    phrases: [
      "compared to", "last month", "this month vs", "year over year",
      "month over month", "how does", "better or worse", "change from"
    ],
    weight: 1.1,
  },
  anomaly_detection: {
    keywords: [
      "unusual", "strange", "unexpected", "suspicious", "fraud", "wrong",
      "error", "mistake", "duplicate", "weird", "odd"
    ],
    phrases: [
      "something wrong", "doesn't look right", "unusual spending",
      "strange transaction", "didn't recognize", "unexpected charge",
      "fraud detection", "suspicious activity"
    ],
    weight: 1.4,
  },
  general_advice: {
    keywords: [
      "advice", "help", "suggest", "recommend", "improve", "better",
      "tips", "strategy", "plan", "optimize", "should"
    ],
    phrases: [
      "what should i", "how can i", "any suggestions", "help me",
      "give me advice", "what do you recommend", "best way to",
      "how to improve", "financial advice"
    ],
    weight: 1.0,
  },
};

// Date-related patterns for entity extraction
const DATE_PATTERNS = {
  today: /\b(today|hari ini)\b/i,
  yesterday: /\b(yesterday|semalam)\b/i,
  this_week: /\b(this week|minggu ini)\b/i,
  last_week: /\b(last week|minggu lepas)\b/i,
  this_month: /\b(this month|bulan ini|current month)\b/i,
  last_month: /\b(last month|bulan lepas|previous month)\b/i,
  this_quarter: /\b(this quarter|q[1-4])\b/i,
  this_year: /\b(this year|tahun ini|2024|2025)\b/i,
  last_year: /\b(last year|tahun lepas)\b/i,
  ytd: /\b(ytd|year to date|year-to-date)\b/i,
};

// Month patterns for specific month extraction
const MONTH_PATTERNS = [
  { pattern: /\b(january|jan|januari)\b/i, month: 0 },
  { pattern: /\b(february|feb|februari)\b/i, month: 1 },
  { pattern: /\b(march|mar|mac)\b/i, month: 2 },
  { pattern: /\b(april|apr)\b/i, month: 3 },
  { pattern: /\b(may|mei)\b/i, month: 4 },
  { pattern: /\b(june|jun)\b/i, month: 5 },
  { pattern: /\b(july|jul|julai)\b/i, month: 6 },
  { pattern: /\b(august|aug|ogos)\b/i, month: 7 },
  { pattern: /\b(september|sep)\b/i, month: 8 },
  { pattern: /\b(october|oct|oktober)\b/i, month: 9 },
  { pattern: /\b(november|nov)\b/i, month: 10 },
  { pattern: /\b(december|dec|disember)\b/i, month: 11 },
];

// Amount patterns for entity extraction
const AMOUNT_PATTERNS = {
  exact: /(?:rm|myr|\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
  range: /(?:between|from)\s*(?:rm|myr|\$)?\s*(\d+)\s*(?:to|and|-)\s*(?:rm|myr|\$)?\s*(\d+)/i,
  over: /(?:over|more than|above|exceeding|greater than)\s*(?:rm|myr|\$)?\s*(\d+)/i,
  under: /(?:under|less than|below)\s*(?:rm|myr|\$)?\s*(\d+)/i,
};

// Category patterns
const CATEGORY_PATTERNS = [
  { pattern: /\b(food|makan|f&b|restaurant|groceries|grocery)\b/i, category: "Food & Dining" },
  { pattern: /\b(transport|transportation|petrol|gas|fuel|grab|mrt|lrt|bus)\b/i, category: "Transport" },
  { pattern: /\b(shopping|retail|clothes|clothing)\b/i, category: "Shopping" },
  { pattern: /\b(entertainment|movie|netflix|spotify|gaming)\b/i, category: "Entertainment" },
  { pattern: /\b(utilities|electricity|water|internet|phone|telco)\b/i, category: "Utilities" },
  { pattern: /\b(health|medical|doctor|hospital|pharmacy|medicine)\b/i, category: "Healthcare" },
  { pattern: /\b(education|course|tuition|books|school|university)\b/i, category: "Education" },
  { pattern: /\b(insurance|life insurance|car insurance|health insurance)\b/i, category: "Insurance" },
  { pattern: /\b(rent|rental|housing|mortgage)\b/i, category: "Housing" },
  { pattern: /\b(travel|vacation|holiday|hotel|flight)\b/i, category: "Travel" },
];

/**
 * Classify a user query into an intent with extracted entities
 */
export function classifyIntent(query: string): QueryAnalysis {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Calculate scores for each intent
  const intentScores: Record<QueryIntent, number> = {} as Record<QueryIntent, number>;
  
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 1 * patterns.weight;
      }
    }
    
    // Check phrases (higher weight for exact phrase matches)
    for (const phrase of patterns.phrases) {
      if (normalizedQuery.includes(phrase.toLowerCase())) {
        score += 2 * patterns.weight;
      }
    }
    
    intentScores[intent as QueryIntent] = score;
  }
  
  // Find the highest scoring intent
  let bestIntent: QueryIntent = "general_advice";
  let bestScore = 0;
  
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as QueryIntent;
    }
  }
  
  // Calculate confidence based on score distribution
  const totalScore = Object.values(intentScores).reduce((sum, s) => sum + s, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0.5;
  
  // Extract entities
  const entities = extractEntities(normalizedQuery);
  
  // Determine suggested retrievers based on intent
  const suggestedRetrievers = getSuggestedRetrievers(bestIntent);
  
  return {
    originalQuery: query,
    normalizedQuery,
    intent: bestIntent,
    confidence: Math.min(confidence, 0.95),
    entities,
    suggestedRetrievers,
  };
}

/**
 * Extract entities (dates, amounts, categories) from query
 */
function extractEntities(query: string): QueryAnalysis["entities"] {
  const entities: QueryAnalysis["entities"] = {};
  
  // Extract date range
  for (const [preset, pattern] of Object.entries(DATE_PATTERNS)) {
    if (pattern.test(query)) {
      entities.dateRange = getDateRangePreset(preset as any);
      break;
    }
  }
  
  // Check for specific month mentions
  if (!entities.dateRange) {
    for (const { pattern, month } of MONTH_PATTERNS) {
      if (pattern.test(query)) {
        const yearMatch = query.match(/\b(202[0-9])\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        entities.dateRange = {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
          label: new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" }),
        };
        break;
      }
    }
  }
  
  // Extract amounts
  const rangeMatch = query.match(AMOUNT_PATTERNS.range);
  if (rangeMatch) {
    entities.amounts = {
      min: parseFloat(rangeMatch[1].replace(/,/g, "")),
      max: parseFloat(rangeMatch[2].replace(/,/g, "")),
    };
  } else {
    const overMatch = query.match(AMOUNT_PATTERNS.over);
    const underMatch = query.match(AMOUNT_PATTERNS.under);
    
    if (overMatch) {
      entities.amounts = { min: parseFloat(overMatch[1].replace(/,/g, "")) };
    }
    if (underMatch) {
      entities.amounts = { ...entities.amounts, max: parseFloat(underMatch[1].replace(/,/g, "")) };
    }
  }
  
  // Extract categories
  const matchedCategories: string[] = [];
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(query)) {
      matchedCategories.push(category);
    }
  }
  if (matchedCategories.length > 0) {
    entities.categories = matchedCategories;
  }
  
  // Determine timeframe intent
  if (/\b(day|daily|today)\b/i.test(query)) {
    entities.timeframe = "day";
  } else if (/\b(week|weekly)\b/i.test(query)) {
    entities.timeframe = "week";
  } else if (/\b(month|monthly)\b/i.test(query)) {
    entities.timeframe = "month";
  } else if (/\b(quarter|quarterly)\b/i.test(query)) {
    entities.timeframe = "quarter";
  } else if (/\b(year|yearly|annual)\b/i.test(query)) {
    entities.timeframe = "year";
  }
  
  // Check for comparison intent
  if (/\b(compare|versus|vs|compared to|difference)\b/i.test(query)) {
    entities.comparison = true;
  }
  
  return entities;
}

/**
 * Get suggested retrievers based on intent
 */
function getSuggestedRetrievers(intent: QueryIntent): string[] {
  const retrieverMap: Record<QueryIntent, string[]> = {
    tax_optimization: ["tax", "transactions", "income"],
    spending_analysis: ["transactions", "budgets", "forecasts"],
    budget_review: ["budgets", "transactions"],
    goal_progress: ["goals", "transactions", "income"],
    subscription_review: ["subscriptions", "transactions"],
    credit_card_advice: ["credit_cards", "transactions"],
    income_analysis: ["income", "transactions", "tax"],
    forecast_review: ["forecasts", "transactions", "budgets"],
    comparison: ["transactions", "budgets", "income"],
    anomaly_detection: ["transactions", "forecasts"],
    general_advice: ["transactions", "budgets", "goals", "income"],
  };
  
  return retrieverMap[intent] || ["transactions"];
}

/**
 * Re-classify with additional context (for CRAG refinement)
 */
export function refineIntent(
  originalAnalysis: QueryAnalysis,
  retrievedDataSummary: string
): QueryAnalysis {
  // This could be enhanced with LLM-based refinement
  // For now, we'll adjust confidence based on data availability
  
  const refinedAnalysis = { ...originalAnalysis };
  
  // If original confidence was low, try to boost with context
  if (originalAnalysis.confidence < 0.6) {
    // Check if retrieved data mentions specific intents
    if (retrievedDataSummary.includes("tax") || retrievedDataSummary.includes("relief")) {
      if (originalAnalysis.intent === "general_advice") {
        refinedAnalysis.intent = "tax_optimization";
        refinedAnalysis.confidence = 0.7;
      }
    }
  }
  
  return refinedAnalysis;
}

/**
 * Check if query is a clarifying question (not actionable)
 */
export function isClarifyingQuestion(query: string): boolean {
  const clarifyingPatterns = [
    /^(what|who|how|why|when|where|which)\s+(is|are|do|does|did|was|were)\s+/i,
    /^can you explain/i,
    /^tell me (about|more)/i,
    /^define\s+/i,
  ];
  
  // If it's just asking for definitions or explanations, it's clarifying
  for (const pattern of clarifyingPatterns) {
    if (pattern.test(query) && query.split(" ").length < 8) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate query expansion for better retrieval
 */
export function expandQuery(query: string, intent: QueryIntent): string[] {
  const expansions: string[] = [query];
  
  // Add intent-specific expansions
  const intentExpansions: Partial<Record<QueryIntent, string[]>> = {
    tax_optimization: [
      "LHDN relief categories",
      "tax deductions for the year",
      "PCB monthly tax deduction",
    ],
    spending_analysis: [
      "expense breakdown by category",
      "transaction history",
      "spending patterns",
    ],
    budget_review: [
      "budget utilization",
      "spending vs budget",
      "category budgets",
    ],
    goal_progress: [
      "savings goals progress",
      "target amounts",
      "goal deadlines",
    ],
    subscription_review: [
      "recurring payments",
      "subscription costs",
      "active subscriptions",
    ],
    credit_card_advice: [
      "credit card utilization",
      "card spending patterns",
      "payment due dates",
    ],
    income_analysis: [
      "income sources",
      "salary and bonuses",
      "income trends",
    ],
    forecast_review: [
      "spending predictions",
      "projected expenses",
      "budget projections",
    ],
  };
  
  const addedExpansions = intentExpansions[intent];
  if (addedExpansions) {
    expansions.push(...addedExpansions);
  }
  
  return expansions;
}
