/**
 * CRAG Orchestrator
 * 
 * The main orchestrator for the Corrective RAG pipeline.
 * Coordinates all components:
 * 1. Intent Classification
 * 2. Data Retrieval
 * 3. Relevance Grading
 * 4. Query Rewriting (if needed)
 * 5. Context Assembly
 * 6. Response Generation
 * 7. Hallucination Checking
 * 8. Response Refinement (if needed)
 * 
 * Implements self-correcting behavior for robust, accurate responses.
 */

import { AIClient, ChatMessage, ChatResponse } from '../clients/types';
import { 
  classifyIntent, 
  refineIntent, 
  expandQuery 
} from '../intent-classifier';
import { 
  assembleContext, 
  formatContextForLLM 
} from '../context-assembler';
import { 
  QueryIntent, 
  QueryAnalysis, 
  AssembledContext, 
  RetrievedData 
} from '../retrievers/types';
import { 
  RelevanceGrader, 
  createRelevanceGrader, 
  AggregatedGradingResult 
} from './relevance-grader';
import { 
  QueryRewriter, 
  createQueryRewriter, 
  QueryRewriteResult 
} from './query-rewriter';
import { 
  HallucinationChecker, 
  createHallucinationChecker, 
  ValidationResult 
} from './hallucination-checker';
import { AIDataAccessPermissions } from '../security';

/**
 * CRAG Pipeline Response
 */
export interface CRAGResponse {
  content: string;
  metadata: CRAGMetadata;
}

/**
 * Metadata about the CRAG process
 */
export interface CRAGMetadata {
  // Query processing
  originalQuery: string;
  processedQuery: string;
  intent: QueryIntent;
  intentConfidence: number;

  // Retrieval info
  dataSources: string[];
  documentsRetrieved: number;
  documentsRelevant: number;
  relevanceScore: number;

  // Pipeline actions
  queryRewritten: boolean;
  webSearchUsed: boolean;
  regenerated: boolean;

  // Quality metrics
  hallucinationScore: number;
  confidenceScore: number;

  // Performance
  totalLatencyMs: number;
  llmCalls: number;
  tokensUsed: number;
}

/**
 * CRAG Configuration
 */
export interface CRAGConfig {
  // Thresholds
  relevanceThreshold: number;
  hallucinationThreshold: number;
  maxRetries: number;

  // Feature flags
  enableQueryRewrite: boolean;
  enableHallucinationCheck: boolean;
  enableWebSearch: boolean;
  useQuickGrading: boolean;

  // Limits
  maxTokens: number;
  temperature: number;
}

const DEFAULT_CONFIG: CRAGConfig = {
  relevanceThreshold: 0.7,
  hallucinationThreshold: 0.7,
  maxRetries: 2,
  enableQueryRewrite: true,
  enableHallucinationCheck: true,
  enableWebSearch: false, // Disabled by default
  useQuickGrading: false,
  maxTokens: 2048,
  temperature: 0.7,
};

/**
 * CRAG Orchestrator Class
 */
export class CRAGOrchestrator {
  private client: AIClient;
  private config: CRAGConfig;
  private relevanceGrader: RelevanceGrader;
  private queryRewriter: QueryRewriter;
  private hallucinationChecker: HallucinationChecker;

  constructor(client: AIClient, config: Partial<CRAGConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize components
    this.relevanceGrader = createRelevanceGrader(client, {
      thresholds: {
        minRelevanceScore: 0.5,
        minRelevantRatio: this.config.relevanceThreshold,
        webSearchThreshold: 0.3,
      },
      useQuickMode: this.config.useQuickGrading,
    });

    this.queryRewriter = createQueryRewriter(client);
    this.hallucinationChecker = createHallucinationChecker(client, {
      strictMode: true,
      minAcceptableScore: this.config.hallucinationThreshold,
    });
  }

  /**
   * Process a query through the full CRAG pipeline
   */
  async process(
    query: string,
    userId: string,
    options?: {
      conversationHistory?: ChatMessage[];
      dataAccessPermissions?: AIDataAccessPermissions;
    }
  ): Promise<CRAGResponse> {
    const startTime = Date.now();
    let llmCalls = 0;
    let tokensUsed = 0;

    // Initialize metadata
    const metadata: CRAGMetadata = {
      originalQuery: query,
      processedQuery: query,
      intent: 'general_advice',
      intentConfidence: 0,
      dataSources: [],
      documentsRetrieved: 0,
      documentsRelevant: 0,
      relevanceScore: 0,
      queryRewritten: false,
      webSearchUsed: false,
      regenerated: false,
      hallucinationScore: 1,
      confidenceScore: 0,
      totalLatencyMs: 0,
      llmCalls: 0,
      tokensUsed: 0,
    };

    try {
      // Step 1: Classify Intent
      const queryAnalysis = classifyIntent(query);
      metadata.intent = queryAnalysis.intent;
      metadata.intentConfidence = queryAnalysis.confidence;

      // Step 2: Initial Retrieval
      let context = await assembleContext(
        userId,
        queryAnalysis,
        options?.dataAccessPermissions as Record<string, boolean> | undefined
      );
      metadata.dataSources = context.metadata.retrieversUsed;
      metadata.documentsRetrieved = context.relevantData.length;

      // Step 3: Grade Relevance
      const gradingResult = await this.relevanceGrader.gradeDocuments(
        context.relevantData,
        query
      );
      metadata.documentsRelevant = gradingResult.relevantCount;
      metadata.relevanceScore = gradingResult.averageScore;
      llmCalls += this.config.useQuickGrading ? 0 : context.relevantData.length;

      // Step 4: Query Rewrite if needed
      if (gradingResult.needsQueryRewrite && this.config.enableQueryRewrite) {
        const rewriteResult = await this.queryRewriter.rewriteQuery(query, {
          intent: queryAnalysis.intent,
          failedRetrievalReason: 'Low relevance scores',
        });
        
        if (rewriteResult.confidence > queryAnalysis.confidence) {
          metadata.queryRewritten = true;
          metadata.processedQuery = rewriteResult.rewrittenQuery;
          llmCalls++;

          // Re-retrieve with improved query
          const refinedAnalysis = refineIntent(queryAnalysis, '');
          refinedAnalysis.normalizedQuery = rewriteResult.rewrittenQuery;
          
          context = await assembleContext(
            userId,
            refinedAnalysis,
            options?.dataAccessPermissions as Record<string, boolean> | undefined
          );
          
          // Re-grade
          const reGradingResult = await this.relevanceGrader.gradeDocuments(
            context.relevantData,
            rewriteResult.rewrittenQuery
          );
          metadata.relevanceScore = reGradingResult.averageScore;
          metadata.documentsRelevant = reGradingResult.relevantCount;
        }
      }

      // Step 5: Web Search Fallback (if enabled and needed)
      if (
        this.config.enableWebSearch &&
        gradingResult.needsWebSearch &&
        metadata.relevanceScore < 0.3
      ) {
        metadata.webSearchUsed = true;
        // Web search would be implemented here
        // For now, we'll add a note to the context
        context.summaries.insights.push(
          '⚠️ Limited data available. Consider adding more transactions for better insights.'
        );
      }

      // Step 6: Generate Response
      let response = await this.generateResponse(
        query,
        context,
        options?.conversationHistory
      );
      llmCalls++;
      tokensUsed += response.usage.totalTokens;

      // Step 7: Hallucination Check
      let validationResult: ValidationResult | null = null;
      if (this.config.enableHallucinationCheck) {
        validationResult = await this.hallucinationChecker.validateResponse(
          response.content,
          context
        );
        metadata.hallucinationScore = validationResult.overallScore;
        llmCalls++;

        // Step 8: Regenerate if needed
        if (!validationResult.isValid && this.config.maxRetries > 0) {
          const regenerated = await this.regenerateResponse(
            query,
            context,
            response.content,
            validationResult,
            options?.conversationHistory
          );
          
          if (regenerated) {
            response = regenerated;
            metadata.regenerated = true;
            llmCalls++;
            tokensUsed += regenerated.usage.totalTokens;

            // Re-validate
            const reValidation = await this.hallucinationChecker.validateResponse(
              regenerated.content,
              context
            );
            metadata.hallucinationScore = reValidation.overallScore;
            llmCalls++;
          }
        }
      }

      // Calculate final confidence
      metadata.confidenceScore = this.calculateConfidence(
        metadata.relevanceScore,
        metadata.hallucinationScore,
        metadata.intentConfidence
      );

      // Finalize metadata
      metadata.totalLatencyMs = Date.now() - startTime;
      metadata.llmCalls = llmCalls;
      metadata.tokensUsed = tokensUsed;

      return {
        content: response.content,
        metadata,
      };
    } catch (error) {
      // Error fallback response
      metadata.totalLatencyMs = Date.now() - startTime;
      metadata.llmCalls = llmCalls;
      metadata.tokensUsed = tokensUsed;
      metadata.confidenceScore = 0;

      return {
        content: this.generateErrorResponse(error),
        metadata,
      };
    }
  }

  /**
   * Generate response using LLM
   */
  private async generateResponse(
    query: string,
    context: AssembledContext,
    conversationHistory?: ChatMessage[]
  ): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const contextPrompt = formatContextForLLM(context);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include recent history (last 5 exchanges)
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // Add current context and query
    messages.push({
      role: 'user',
      content: `${contextPrompt}\n\n---\n\nUser Question: ${query}`,
    });

    return this.client.chat(messages, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Regenerate response with validation feedback
   */
  private async regenerateResponse(
    query: string,
    context: AssembledContext,
    previousResponse: string,
    validation: ValidationResult,
    conversationHistory?: ChatMessage[]
  ): Promise<ChatResponse | null> {
    if (validation.suggestions.length === 0) {
      return null;
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const contextPrompt = formatContextForLLM(context);

    const correctionPrompt = `Your previous response contained some issues:
${validation.issues.map((i) => `- ${i.type}: ${i.explanation}`).join('\n')}

Corrections needed:
${validation.suggestions.map((s) => `- ${s}`).join('\n')}

Please regenerate your response, ensuring all claims are grounded in the provided data.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${contextPrompt}\n\n---\n\nUser Question: ${query}`,
      },
      {
        role: 'assistant',
        content: previousResponse,
      },
      {
        role: 'user',
        content: correctionPrompt,
      },
    ];

    return this.client.chat(messages, {
      temperature: 0.3, // Lower temperature for corrections
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: AssembledContext): string {
    const basePrompt = `You are Prismo AI, a sophisticated personal finance assistant specializing in Malaysian financial planning. You provide personalized, actionable financial advice based on the user's actual financial data.

CORE PRINCIPLES:
1. ACCURACY: Only state facts that are in the provided context. Never fabricate numbers.
2. ACTIONABLE: Give specific, practical recommendations.
3. MALAYSIAN CONTEXT: Consider LHDN tax rules, EPF, SOCSO, local banks, and MYR currency.
4. EMPATHETIC: Be supportive and encouraging about financial goals.
5. CONCISE: Be clear and to-the-point. Use bullet points for lists.

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide 2-3 key insights from the data
- End with 1-2 actionable recommendations
- Use RM for all currency amounts
- Include specific numbers when available

CURRENT CONTEXT:
- Date Range: ${context.dateRange.label || 'Not specified'}
- Intent: ${context.intent.replace(/_/g, ' ')}
- Data Sources: ${context.metadata.retrieversUsed.join(', ')}`;

    // Add intent-specific instructions
    const intentInstructions = this.getIntentInstructions(context.intent);

    return `${basePrompt}\n\n${intentInstructions}`;
  }

  /**
   * Get intent-specific instructions
   */
  private getIntentInstructions(intent: QueryIntent): string {
    const instructions: Partial<Record<QueryIntent, string>> = {
      tax_optimization: `TAX OPTIMIZATION FOCUS:
- Reference specific LHDN relief categories
- Calculate potential tax savings
- Mention relief limits and remaining allowances
- Consider the user's tax bracket for impact calculations`,

      spending_analysis: `SPENDING ANALYSIS FOCUS:
- Highlight top spending categories
- Compare to budgets if available
- Identify unusual patterns or spikes
- Suggest specific areas for potential savings`,

      budget_review: `BUDGET REVIEW FOCUS:
- Show utilization percentages
- Flag over-budget categories
- Acknowledge under-budget wins
- Provide realistic adjustment suggestions`,

      goal_progress: `GOAL TRACKING FOCUS:
- Calculate progress percentages
- Estimate completion dates
- Suggest contribution adjustments
- Celebrate milestones achieved`,

      credit_card_advice: `CREDIT CARD FOCUS:
- Reference credit utilization best practices (under 30%)
- Mention payment due dates if approaching
- Suggest optimal card usage based on rewards
- Warn about high utilization impact`,

      income_analysis: `INCOME ANALYSIS FOCUS:
- Calculate savings rate
- Identify income trends
- Compare to expenses for net position
- Suggest income diversification if relevant`,
    };

    return instructions[intent] || `Provide helpful, data-grounded financial guidance.`;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    relevanceScore: number,
    hallucinationScore: number,
    intentConfidence: number
  ): number {
    // Weighted average
    const weights = {
      relevance: 0.35,
      hallucination: 0.45,
      intent: 0.20,
    };

    return (
      relevanceScore * weights.relevance +
      hallucinationScore * weights.hallucination +
      intentConfidence * weights.intent
    );
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(error: unknown): string {
    console.error('CRAG Pipeline error:', error);

    return `I apologize, but I encountered an issue while analyzing your financial data. This could be due to:

• Limited data available for analysis
• A temporary processing issue

Please try:
1. Rephrasing your question
2. Being more specific about the time period
3. Checking that you have transaction data for the period in question

If the issue persists, please try again in a few moments.`;
  }
}

/**
 * Create a CRAG Orchestrator
 */
export function createCRAGOrchestrator(
  client: AIClient,
  config?: Partial<CRAGConfig>
): CRAGOrchestrator {
  return new CRAGOrchestrator(client, config);
}
