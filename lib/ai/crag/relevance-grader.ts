/**
 * Relevance Grader
 * 
 * Evaluates the relevance of retrieved documents to the user's query.
 * Uses LLM-based semantic evaluation with structured output.
 * 
 * Part of the Corrective RAG (CRAG) pipeline.
 */

import { AIClient, ChatMessage, StructuredOutputSchema } from '../clients/types';
import { RetrievedData } from '../retrievers/types';

/**
 * Result of relevance grading for a single document
 */
export interface GradingResult {
  isRelevant: boolean;
  score: number; // 0-1
  reason: string;
  documentSource: string;
}

/**
 * Aggregated grading results for multiple documents
 */
export interface AggregatedGradingResult {
  documents: GradingResult[];
  relevantCount: number;
  totalCount: number;
  averageScore: number;
  needsQueryRewrite: boolean;
  needsWebSearch: boolean;
}

/**
 * Threshold configuration
 */
export interface GradingThresholds {
  minRelevanceScore: number; // Score below which a doc is irrelevant
  minRelevantRatio: number;  // Ratio below which query rewrite is triggered
  webSearchThreshold: number; // Ratio below which web search is triggered
}

const DEFAULT_THRESHOLDS: GradingThresholds = {
  minRelevanceScore: 0.5,
  minRelevantRatio: 0.7,
  webSearchThreshold: 0.3,
};

/**
 * Schema for structured LLM output
 */
interface RelevanceAssessment {
  is_relevant: 'yes' | 'no' | 'partial';
  confidence: number;
  reasoning: string;
  key_matches: string[];
  missing_aspects: string[];
}

const RELEVANCE_SCHEMA: StructuredOutputSchema<RelevanceAssessment> = {
  name: 'RelevanceAssessment',
  description: 'Assessment of document relevance to a query',
  schema: {
    type: 'object',
    properties: {
      is_relevant: {
        type: 'string',
        enum: ['yes', 'no', 'partial'],
        description: 'Whether the document is relevant to the query',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence score between 0 and 1',
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of the relevance assessment',
      },
      key_matches: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key aspects of the query that the document addresses',
      },
      missing_aspects: {
        type: 'array',
        items: { type: 'string' },
        description: 'Aspects of the query not covered by the document',
      },
    },
    required: ['is_relevant', 'confidence', 'reasoning'],
  },
  parse: (json: string) => {
    const parsed = JSON.parse(json);
    return {
      is_relevant: parsed.is_relevant || 'no',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning || 'No reasoning provided',
      key_matches: Array.isArray(parsed.key_matches) ? parsed.key_matches : [],
      missing_aspects: Array.isArray(parsed.missing_aspects) ? parsed.missing_aspects : [],
    };
  },
};

/**
 * System prompt for relevance grading
 */
const GRADING_SYSTEM_PROMPT = `You are an expert relevance evaluator for a financial assistant. Your task is to assess whether a retrieved document is relevant to answering a user's financial question.

Guidelines:
1. Focus on SEMANTIC relevance, not just keyword matching
2. Consider whether the document provides information that could help answer the question
3. For financial queries, relevance includes:
   - Data that directly answers the question (spending, income, budgets, etc.)
   - Contextual information that helps interpret the answer
   - Related financial metrics or trends
4. Mark as "partial" if the document contains some relevant information but not everything needed

Be strict but fair. If the document contains useful financial data related to the query, it's likely relevant.

Respond with JSON only.`;

/**
 * Relevance Grader class
 */
export class RelevanceGrader {
  private client: AIClient;
  private thresholds: GradingThresholds;
  private useQuickMode: boolean;

  constructor(
    client: AIClient,
    thresholds: GradingThresholds = DEFAULT_THRESHOLDS,
    useQuickMode: boolean = false // Quick mode uses heuristics instead of LLM
  ) {
    this.client = client;
    this.thresholds = thresholds;
    this.useQuickMode = useQuickMode;
  }

  /**
   * Grade a single document's relevance to a query
   */
  async gradeDocument(
    document: RetrievedData,
    query: string
  ): Promise<GradingResult> {
    // Use quick heuristic mode if enabled (for cost savings)
    if (this.useQuickMode) {
      return this.quickGrade(document, query);
    }

    // Prepare document summary for grading
    const documentSummary = this.prepareDocumentSummary(document);

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: GRADING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Query: "${query}"

Document Source: ${document.source}
Document Description: ${document.description}
Record Count: ${document.recordCount}
Date Range: ${document.dateRange?.label || 'Not specified'}

Document Content Summary:
${documentSummary}

Assess the relevance of this document to the query. Respond with JSON.`,
        },
      ];

      // Use structured output if available, otherwise parse JSON manually
      let assessment: RelevanceAssessment;

      if (this.client.chatStructured) {
        assessment = await this.client.chatStructured(
          messages,
          RELEVANCE_SCHEMA,
          { temperature: 0, maxTokens: 500 }
        );
      } else {
        const response = await this.client.chat(messages, {
          temperature: 0,
          maxTokens: 500,
          responseFormat: 'json_object',
        });
        assessment = RELEVANCE_SCHEMA.parse(response.content);
      }

      // Convert assessment to grading result
      const score = this.assessmentToScore(assessment);

      return {
        isRelevant: score >= this.thresholds.minRelevanceScore,
        score,
        reason: assessment.reasoning,
        documentSource: document.source,
      };
    } catch (error) {
      // Fallback to quick grade on error
      console.error('LLM grading failed, using heuristic:', error);
      return this.quickGrade(document, query);
    }
  }

  /**
   * Grade multiple documents and aggregate results
   */
  async gradeDocuments(
    documents: RetrievedData[],
    query: string
  ): Promise<AggregatedGradingResult> {
    // Grade documents in parallel (with limit to avoid rate limits)
    const batchSize = 5;
    const results: GradingResult[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((doc) => this.gradeDocument(doc, query))
      );
      results.push(...batchResults);
    }

    // Aggregate results
    const relevantDocs = results.filter((r) => r.isRelevant);
    const averageScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;
    const relevantRatio = results.length > 0
      ? relevantDocs.length / results.length
      : 0;

    return {
      documents: results,
      relevantCount: relevantDocs.length,
      totalCount: results.length,
      averageScore,
      needsQueryRewrite: relevantRatio < this.thresholds.minRelevantRatio,
      needsWebSearch: relevantRatio < this.thresholds.webSearchThreshold,
    };
  }

  /**
   * Quick heuristic-based grading (no LLM call)
   */
  private quickGrade(document: RetrievedData, query: string): GradingResult {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);

    // Check source relevance
    const sourceRelevance = this.checkSourceRelevance(document.source, queryLower);

    // Check if insights mention relevant terms
    const insightMatches = this.countInsightMatches(document.insights || [], queryWords);

    // Check aggregations for relevant data
    const hasRelevantAggregations = this.checkAggregations(document.aggregations || {}, queryWords);

    // Check record count (empty data is less relevant)
    const hasData = document.recordCount > 0;

    // Calculate score
    let score = 0;
    if (sourceRelevance) score += 0.4;
    if (insightMatches > 0) score += Math.min(0.3, insightMatches * 0.1);
    if (hasRelevantAggregations) score += 0.2;
    if (hasData) score += 0.1;

    return {
      isRelevant: score >= this.thresholds.minRelevanceScore,
      score,
      reason: `Heuristic: source=${sourceRelevance}, insights=${insightMatches}, aggregations=${hasRelevantAggregations}, hasData=${hasData}`,
      documentSource: document.source,
    };
  }

  /**
   * Check if document source is relevant to query
   */
  private checkSourceRelevance(source: string, query: string): boolean {
    const sourceMap: Record<string, string[]> = {
      transactions: ['spending', 'spent', 'expense', 'bought', 'purchase', 'money', 'payment'],
      budgets: ['budget', 'limit', 'allocation', 'spending limit'],
      goals: ['goal', 'target', 'saving', 'savings', 'save for'],
      subscriptions: ['subscription', 'recurring', 'monthly', 'cancel'],
      credit_cards: ['credit card', 'card', 'credit', 'utilization', 'payment due'],
      tax: ['tax', 'deduction', 'relief', 'lhdn', 'pcb', 'claim'],
      income: ['income', 'salary', 'earning', 'earned', 'paycheck'],
      forecasts: ['forecast', 'predict', 'projection', 'next month', 'future'],
    };

    const keywords = sourceMap[source] || [];
    return keywords.some((keyword) => query.includes(keyword));
  }

  /**
   * Count how many query words appear in insights
   */
  private countInsightMatches(insights: string[], queryWords: string[]): number {
    const insightText = insights.join(' ').toLowerCase();
    return queryWords.filter((word) => insightText.includes(word)).length;
  }

  /**
   * Check if aggregations contain relevant data
   */
  private checkAggregations(
    aggregations: Record<string, unknown>,
    queryWords: string[]
  ): boolean {
    const aggText = JSON.stringify(aggregations).toLowerCase();
    return queryWords.some((word) => aggText.includes(word));
  }

  /**
   * Convert LLM assessment to numeric score
   */
  private assessmentToScore(assessment: RelevanceAssessment): number {
    const baseScore = assessment.confidence;
    
    switch (assessment.is_relevant) {
      case 'yes':
        return Math.max(0.7, baseScore);
      case 'partial':
        return Math.max(0.4, Math.min(0.7, baseScore));
      case 'no':
        return Math.min(0.3, baseScore);
      default:
        return baseScore;
    }
  }

  /**
   * Prepare a concise summary of the document for grading
   */
  private prepareDocumentSummary(document: RetrievedData): string {
    const parts: string[] = [];

    // Add aggregations summary
    if (document.aggregations && Object.keys(document.aggregations).length > 0) {
      const aggSummary = Object.entries(document.aggregations)
        .slice(0, 10)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      parts.push(`Key Metrics:\n${aggSummary}`);
    }

    // Add insights
    if (document.insights && document.insights.length > 0) {
      parts.push(`Insights:\n${document.insights.slice(0, 5).join('\n')}`);
    }

    // Add sample data (limited)
    if (document.data && document.data.length > 0) {
      const sampleSize = Math.min(3, document.data.length);
      const sample = document.data.slice(0, sampleSize);
      parts.push(`Sample Data (${sampleSize} of ${document.data.length}):\n${JSON.stringify(sample, null, 2)}`);
    }

    return parts.join('\n\n') || 'No detailed content available';
  }
}

/**
 * Create a relevance grader with default settings
 */
export function createRelevanceGrader(
  client: AIClient,
  options?: {
    thresholds?: Partial<GradingThresholds>;
    useQuickMode?: boolean;
  }
): RelevanceGrader {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };
  return new RelevanceGrader(client, thresholds, options?.useQuickMode);
}
