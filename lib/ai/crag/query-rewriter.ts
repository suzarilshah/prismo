/**
 * Query Rewriter
 * 
 * Transforms and improves user queries for better retrieval results.
 * Uses LLM-based semantic understanding to:
 * - Clarify ambiguous queries
 * - Expand abbreviations and acronyms
 * - Add context from previous interactions
 * - Decompose complex questions into sub-queries
 * 
 * Part of the Corrective RAG (CRAG) pipeline.
 */

import { AIClient, ChatMessage, StructuredOutputSchema } from '../clients/types';
import { QueryIntent } from '../retrievers/types';

/**
 * Query rewrite result
 */
export interface QueryRewriteResult {
  originalQuery: string;
  rewrittenQuery: string;
  subQueries: string[];
  expansions: string[];
  intent: QueryIntent;
  confidence: number;
}

/**
 * Context for query rewriting
 */
export interface RewriteContext {
  previousQueries?: string[];
  previousResponses?: string[];
  intent?: QueryIntent;
  failedRetrievalReason?: string;
  userFinancialContext?: {
    currency?: string;
    hasTransactions?: boolean;
    hasBudgets?: boolean;
    hasGoals?: boolean;
    hasTaxData?: boolean;
  };
}

/**
 * LLM output schema for query rewrite
 */
interface RewriteAssessment {
  rewritten_query: string;
  sub_queries: string[];
  query_expansions: string[];
  detected_intent: string;
  confidence: number;
  reasoning: string;
}

const REWRITE_SCHEMA: StructuredOutputSchema<RewriteAssessment> = {
  name: 'QueryRewrite',
  description: 'Rewritten and improved query for financial data retrieval',
  schema: {
    type: 'object',
    properties: {
      rewritten_query: {
        type: 'string',
        description: 'The improved, clearer version of the original query',
      },
      sub_queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Decomposed sub-questions for complex queries',
      },
      query_expansions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Semantic expansions and related terms',
      },
      detected_intent: {
        type: 'string',
        description: 'The detected user intent',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the rewrite (0-1)',
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of changes made',
      },
    },
    required: ['rewritten_query', 'detected_intent', 'confidence'],
  },
  parse: (json: string) => {
    const parsed = JSON.parse(json);
    return {
      rewritten_query: parsed.rewritten_query || parsed.original_query,
      sub_queries: Array.isArray(parsed.sub_queries) ? parsed.sub_queries : [],
      query_expansions: Array.isArray(parsed.query_expansions) ? parsed.query_expansions : [],
      detected_intent: parsed.detected_intent || 'general_advice',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || '',
    };
  },
};

/**
 * System prompt for query rewriting
 */
const REWRITE_SYSTEM_PROMPT = `You are an expert query optimizer for a personal finance assistant called Prismo. Your task is to improve user queries for better financial data retrieval.

The system has access to:
- Transaction history (spending, income)
- Budgets and budget utilization
- Financial goals and progress
- Subscriptions and recurring payments
- Credit card information
- Malaysian tax data (LHDN reliefs, PCB)
- Income analysis
- Spending forecasts

Guidelines for query rewriting:
1. Preserve the user's intent while making the query more specific
2. Expand abbreviations (e.g., "PCB" → "Potongan Cukai Bulanan / Monthly Tax Deduction")
3. Add time context if missing (e.g., "spending" → "spending this month")
4. Break complex questions into sub-queries
5. Include Malaysian financial context where relevant (MYR, LHDN, EPF, etc.)

For each query, provide:
- A clearer, more specific rewritten query
- Sub-queries for complex questions
- Related terms and expansions
- The detected intent category

Respond with JSON only.`;

/**
 * Query Rewriter class
 */
export class QueryRewriter {
  private client: AIClient;
  private maxRetries: number;

  constructor(client: AIClient, maxRetries: number = 2) {
    this.client = client;
    this.maxRetries = maxRetries;
  }

  /**
   * Rewrite a query for better retrieval
   */
  async rewriteQuery(
    query: string,
    context?: RewriteContext
  ): Promise<QueryRewriteResult> {
    // First try heuristic rewriting for simple cases
    const heuristicResult = this.heuristicRewrite(query);
    if (heuristicResult.confidence > 0.8) {
      return heuristicResult;
    }

    // Use LLM for complex queries
    try {
      const contextPrompt = this.buildContextPrompt(context);

      const messages: ChatMessage[] = [
        { role: 'system', content: REWRITE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${contextPrompt}

Original Query: "${query}"

${context?.failedRetrievalReason ? `Note: Previous retrieval failed because: ${context.failedRetrievalReason}` : ''}

Rewrite this query for optimal financial data retrieval. Respond with JSON.`,
        },
      ];

      let assessment: RewriteAssessment;

      if (this.client.chatStructured) {
        assessment = await this.client.chatStructured(
          messages,
          REWRITE_SCHEMA,
          { temperature: 0.3, maxTokens: 500 }
        );
      } else {
        const response = await this.client.chat(messages, {
          temperature: 0.3,
          maxTokens: 500,
          responseFormat: 'json_object',
        });
        assessment = REWRITE_SCHEMA.parse(response.content);
      }

      return {
        originalQuery: query,
        rewrittenQuery: assessment.rewritten_query,
        subQueries: assessment.sub_queries,
        expansions: assessment.query_expansions,
        intent: this.mapIntent(assessment.detected_intent),
        confidence: assessment.confidence,
      };
    } catch (error) {
      console.error('LLM query rewrite failed:', error);
      // Fallback to heuristic result
      return heuristicResult;
    }
  }

  /**
   * Rewrite query specifically for web search (if needed)
   */
  async rewriteForWebSearch(query: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a query optimizer for web search. Transform the user's financial question into an effective web search query.

Focus on:
- Malaysian financial context (LHDN, EPF, Malaysian banks)
- Current year tax information
- Official sources preference

Return ONLY the search query, nothing else.`,
        },
        {
          role: 'user',
          content: `Transform this for web search: "${query}"`,
        },
      ];

      const response = await this.client.chat(messages, {
        temperature: 0,
        maxTokens: 100,
      });

      return response.content.trim().replace(/^["']|["']$/g, '');
    } catch {
      // Fallback: add Malaysia context
      return `${query} Malaysia 2024`;
    }
  }

  /**
   * Decompose a complex query into sub-queries
   */
  async decomposeQuery(query: string): Promise<string[]> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `Decompose complex financial questions into simpler sub-questions. Each sub-question should target a specific piece of information.

Examples:
"How am I doing financially?" →
1. "What is my total spending this month?"
2. "Am I staying within my budgets?"
3. "How are my savings goals progressing?"
4. "What is my net cash flow?"

Return a JSON array of sub-questions.`,
        },
        {
          role: 'user',
          content: query,
        },
      ];

      const response = await this.client.chat(messages, {
        temperature: 0.3,
        maxTokens: 300,
        responseFormat: 'json_object',
      });

      const parsed = JSON.parse(response.content);
      return Array.isArray(parsed.questions) ? parsed.questions : 
             Array.isArray(parsed) ? parsed : [query];
    } catch {
      return [query];
    }
  }

  /**
   * Heuristic-based query rewriting
   */
  private heuristicRewrite(query: string): QueryRewriteResult {
    let rewritten = query;
    const expansions: string[] = [];
    let intent: QueryIntent = 'general_advice';
    let confidence = 0.5;

    const queryLower = query.toLowerCase();

    // Time context
    if (!queryLower.includes('month') && !queryLower.includes('year') && !queryLower.includes('week')) {
      if (queryLower.includes('spending') || queryLower.includes('spent')) {
        rewritten = rewritten.replace(/spending|spent/i, 'spending this month');
        confidence += 0.1;
      }
    }

    // Expand common abbreviations
    const abbreviations: Record<string, { expanded: string; intent: QueryIntent }> = {
      'pcb': { expanded: 'Potongan Cukai Bulanan (Monthly Tax Deduction)', intent: 'tax_optimization' },
      'epf': { expanded: 'Employees Provident Fund (KWSP)', intent: 'tax_optimization' },
      'kwsp': { expanded: 'KWSP (EPF)', intent: 'tax_optimization' },
      'socso': { expanded: 'SOCSO (PERKESO)', intent: 'tax_optimization' },
      'lhdn': { expanded: 'LHDN (Inland Revenue Board)', intent: 'tax_optimization' },
      'ya': { expanded: 'Year of Assessment', intent: 'tax_optimization' },
    };

    for (const [abbr, info] of Object.entries(abbreviations)) {
      if (queryLower.includes(abbr)) {
        expansions.push(info.expanded);
        intent = info.intent;
        confidence += 0.15;
      }
    }

    // Detect intent from keywords
    const intentKeywords: Record<QueryIntent, string[]> = {
      tax_optimization: ['tax', 'relief', 'deduction', 'claim', 'refund'],
      spending_analysis: ['spending', 'spent', 'expense', 'money going', 'overspend'],
      budget_review: ['budget', 'limit', 'over budget', 'under budget'],
      goal_progress: ['goal', 'saving', 'target', 'reach'],
      subscription_review: ['subscription', 'recurring', 'cancel'],
      credit_card_advice: ['credit card', 'card', 'utilization'],
      income_analysis: ['income', 'salary', 'earning', 'earned'],
      forecast_review: ['forecast', 'predict', 'next month', 'will i spend'],
      comparison: ['compare', 'vs', 'versus', 'last month'],
      anomaly_detection: ['unusual', 'strange', 'suspicious'],
      general_advice: ['advice', 'help', 'should i', 'recommend'],
    };

    for (const [intentKey, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some((kw) => queryLower.includes(kw))) {
        intent = intentKey as QueryIntent;
        confidence += 0.1;
        break;
      }
    }

    // Add Malaysian context for tax queries
    if (intent === 'tax_optimization' && !queryLower.includes('malaysia')) {
      expansions.push('Malaysian tax context');
    }

    confidence = Math.min(confidence, 0.95);

    return {
      originalQuery: query,
      rewrittenQuery: rewritten,
      subQueries: [],
      expansions,
      intent,
      confidence,
    };
  }

  /**
   * Build context prompt from rewrite context
   */
  private buildContextPrompt(context?: RewriteContext): string {
    if (!context) return '';

    const parts: string[] = [];

    if (context.previousQueries && context.previousQueries.length > 0) {
      parts.push(`Previous questions: ${context.previousQueries.slice(-2).join(', ')}`);
    }

    if (context.intent) {
      parts.push(`Detected intent: ${context.intent}`);
    }

    if (context.userFinancialContext) {
      const available: string[] = [];
      if (context.userFinancialContext.hasTransactions) available.push('transactions');
      if (context.userFinancialContext.hasBudgets) available.push('budgets');
      if (context.userFinancialContext.hasGoals) available.push('goals');
      if (context.userFinancialContext.hasTaxData) available.push('tax data');
      
      if (available.length > 0) {
        parts.push(`User has: ${available.join(', ')}`);
      }
    }

    return parts.length > 0 ? `Context:\n${parts.join('\n')}\n` : '';
  }

  /**
   * Map string intent to QueryIntent enum
   */
  private mapIntent(intentString: string): QueryIntent {
    const normalized = intentString.toLowerCase().replace(/\s+/g, '_');
    const validIntents: QueryIntent[] = [
      'tax_optimization',
      'spending_analysis',
      'budget_review',
      'goal_progress',
      'subscription_review',
      'credit_card_advice',
      'income_analysis',
      'forecast_review',
      'comparison',
      'anomaly_detection',
      'general_advice',
    ];

    if (validIntents.includes(normalized as QueryIntent)) {
      return normalized as QueryIntent;
    }

    // Fuzzy match
    for (const intent of validIntents) {
      if (normalized.includes(intent.split('_')[0])) {
        return intent;
      }
    }

    return 'general_advice';
  }
}

/**
 * Create a query rewriter
 */
export function createQueryRewriter(
  client: AIClient,
  options?: { maxRetries?: number }
): QueryRewriter {
  return new QueryRewriter(client, options?.maxRetries);
}
