/**
 * Agentic RAG System
 * 
 * A simplified but powerful RAG implementation that:
 * 1. Retrieves relevant financial data based on intent
 * 2. Formats context for optimal LLM consumption
 * 3. Makes a SINGLE LLM call with rich context
 * 4. Falls back to rule-based responses if LLM fails
 * 
 * Design Principles:
 * - Minimal LLM calls (just 1 for the main response)
 * - Robust error handling with graceful fallbacks
 * - Data-driven insights even without LLM
 * - Clear error messages for configuration issues
 */

import { AIClient, ChatMessage, ChatResponse, AIClientError } from './clients/types';
import { classifyIntent } from './intent-classifier';
import { assembleContext, formatContextForLLM } from './context-assembler';
import { AssembledContext, QueryIntent } from './retrievers/types';
import { AIDataAccessPermissions } from './security';

// ============================================
// Types
// ============================================

export interface AgentResponse {
  content: string;
  metadata: AgentMetadata;
  fallbackUsed: boolean;
}

export interface AgentMetadata {
  query: string;
  intent: QueryIntent;
  dataSources: string[];
  recordsAnalyzed: number;
  processingTimeMs: number;
  confidence: number;
  error?: string;
}

export interface AgentConfig {
  maxTokens: number;
  temperature: number;
  enableFallback: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  maxTokens: 2048,
  temperature: 0.7,
  enableFallback: true,
};

// ============================================
// Agentic RAG Class
// ============================================

export class AgenticRAG {
  private client: AIClient;
  private config: AgentConfig;

  constructor(client: AIClient, config: Partial<AgentConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a query through the agentic RAG pipeline
   */
  async process(
    query: string,
    userId: string,
    options?: {
      conversationHistory?: ChatMessage[];
      dataAccessPermissions?: AIDataAccessPermissions;
    }
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    let context: AssembledContext | null = null;

    // Initialize metadata
    const metadata: AgentMetadata = {
      query,
      intent: 'general_advice',
      dataSources: [],
      recordsAnalyzed: 0,
      processingTimeMs: 0,
      confidence: 0,
    };

    try {
      // Step 1: Classify Intent (rule-based, no LLM needed)
      const queryAnalysis = classifyIntent(query);
      metadata.intent = queryAnalysis.intent;
      metadata.confidence = queryAnalysis.confidence;

      // Step 2: Retrieve Context (database queries)
      context = await assembleContext(
        userId,
        queryAnalysis,
        options?.dataAccessPermissions as Record<string, boolean> | undefined
      );
      metadata.dataSources = context.metadata.retrieversUsed;
      metadata.recordsAnalyzed = context.totalRecords;

      // Step 3: Generate Response with LLM
      const response = await this.generateResponse(
        query,
        context,
        options?.conversationHistory
      );

      metadata.processingTimeMs = Date.now() - startTime;
      metadata.confidence = this.calculateConfidence(context, queryAnalysis.confidence);

      return {
        content: response.content,
        metadata,
        fallbackUsed: false,
      };
    } catch (error) {
      // Handle errors gracefully
      metadata.processingTimeMs = Date.now() - startTime;
      metadata.error = this.getErrorMessage(error);

      // Use fallback if enabled and we have context
      if (this.config.enableFallback && context) {
        const fallbackContent = this.generateFallbackResponse(context, query);
        return {
          content: fallbackContent,
          metadata,
          fallbackUsed: true,
        };
      }

      // Return error message
      return {
        content: this.getDetailedErrorResponse(error),
        metadata,
        fallbackUsed: false,
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

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
      messages.push(...recentHistory);
    }

    // Add context and query
    messages.push({
      role: 'user',
      content: `## Your Financial Data\n\n${contextPrompt}\n\n---\n\n## Question\n${query}`,
    });

    return this.client.chat(messages, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Build the system prompt
   */
  private buildSystemPrompt(context: AssembledContext): string {
    return `You are **Prismo AI**, an elite personal finance assistant with deep expertise in Malaysian financial planning.

## Your Identity
- You speak with confidence and precision
- You provide actionable, data-driven insights
- You understand Malaysian context: LHDN taxes, EPF, local banks, MYR currency
- You are encouraging and supportive about financial goals

## Response Guidelines
1. **Be Direct**: Start with the key answer/insight
2. **Use Data**: Reference specific numbers from the provided context
3. **Be Actionable**: End with 1-2 concrete recommendations
4. **Format Well**: Use bullet points, bold text, and clear structure
5. **Stay Grounded**: Only state facts present in the data

## Current Analysis Context
- **Date Range**: ${context.dateRange.label || 'This Month'}
- **Query Type**: ${context.intent.replace(/_/g, ' ').toUpperCase()}
- **Data Sources**: ${context.metadata.retrieversUsed.join(', ') || 'General'}
- **Records Analyzed**: ${context.totalRecords}

## Malaysian Financial Context
- Currency: Malaysian Ringgit (RM)
- Tax Year: Assessment Year ${new Date().getFullYear()}
- Key Tax Reliefs: Medical, Education, Lifestyle, Insurance
- EPF Rate: 11% employee, 12-13% employer

${this.getIntentSpecificPrompt(context.intent)}`;
  }

  /**
   * Get intent-specific prompt additions
   */
  private getIntentSpecificPrompt(intent: QueryIntent): string {
    const prompts: Partial<Record<QueryIntent, string>> = {
      tax_optimization: `
## Tax Optimization Focus
- Reference specific LHDN relief categories with limits
- Calculate potential tax savings
- Consider tax brackets for impact
- Mention deadline for claims (April 30th)`,

      spending_analysis: `
## Spending Analysis Focus  
- Highlight top 3 spending categories
- Compare to budgets if available
- Identify unusual patterns or spikes
- Calculate daily/weekly averages`,

      budget_review: `
## Budget Review Focus
- Show utilization percentages
- Flag over-budget categories (🔴)
- Celebrate under-budget wins (🟢)
- Suggest realistic adjustments`,

      goal_progress: `
## Goal Tracking Focus
- Calculate exact progress percentages
- Estimate completion dates
- Suggest monthly contribution amounts
- Celebrate milestones achieved`,

      subscription_review: `
## Subscription Review Focus
- Calculate total monthly/annual cost
- Flag unused or duplicate subscriptions
- Suggest potential cancellations
- Compare to typical spending`,

      income_analysis: `
## Income Analysis Focus
- Calculate savings rate
- Show income vs expense ratio
- Identify income trends
- Suggest optimal allocation (50/30/20 rule)`,
    };

    return prompts[intent] || '';
  }

  /**
   * Generate a data-driven fallback response when LLM fails
   */
  private generateFallbackResponse(context: AssembledContext, query: string): string {
    const { summaries, intent, totalRecords, dateRange } = context;
    
    let response = `## Financial Summary\n\n`;
    response += `*Based on ${totalRecords} records from ${dateRange.label || 'this period'}*\n\n`;

    // Add financial summary
    if (summaries.financial) {
      response += `### Overview\n${summaries.financial}\n\n`;
    }

    // Add insights
    if (summaries.insights && summaries.insights.length > 0) {
      response += `### Key Insights\n`;
      summaries.insights.slice(0, 5).forEach((insight) => {
        response += `- ${insight}\n`;
      });
      response += '\n';
    }

    // Add recommendations
    if (summaries.recommendations && summaries.recommendations.length > 0) {
      response += `### Recommendations\n`;
      summaries.recommendations.slice(0, 3).forEach((rec) => {
        response += `- ${rec}\n`;
      });
      response += '\n';
    }

    // Add intent-specific data
    response += this.generateIntentSpecificFallback(context);

    response += `\n---\n*This is an automated summary. For more detailed analysis, please try again or rephrase your question.*`;

    return response;
  }

  /**
   * Generate intent-specific fallback content
   */
  private generateIntentSpecificFallback(context: AssembledContext): string {
    const { relevantData, intent } = context;
    let content = '';

    switch (intent) {
      case 'spending_analysis': {
        const txData = relevantData.find(d => d.source === 'transactions');
        if (txData?.aggregations) {
          content += `### Spending Breakdown\n`;
          content += `- **Total Expenses**: RM ${txData.aggregations.totalExpenses?.toLocaleString() || 'N/A'}\n`;
          content += `- **Total Income**: RM ${txData.aggregations.totalIncome?.toLocaleString() || 'N/A'}\n`;
          if (txData.aggregations.categoryBreakdown) {
            content += `- **Top Categories**: ${Object.keys(txData.aggregations.categoryBreakdown).slice(0, 3).join(', ')}\n`;
          }
        }
        break;
      }

      case 'budget_review': {
        const budgetData = relevantData.find(d => d.source === 'budgets');
        if (budgetData?.aggregations) {
          content += `### Budget Status\n`;
          content += `- **Active Budgets**: ${budgetData.aggregations.activeBudgets || 'N/A'}\n`;
          content += `- **Total Budget**: RM ${budgetData.aggregations.totalBudgeted?.toLocaleString() || 'N/A'}\n`;
          content += `- **Total Spent**: RM ${budgetData.aggregations.totalSpent?.toLocaleString() || 'N/A'}\n`;
        }
        break;
      }

      case 'goal_progress': {
        const goalData = relevantData.find(d => d.source === 'goals');
        if (goalData?.aggregations) {
          content += `### Goal Progress\n`;
          content += `- **Active Goals**: ${goalData.aggregations.activeGoals || 'N/A'}\n`;
          content += `- **Total Saved**: RM ${goalData.aggregations.totalSaved?.toLocaleString() || 'N/A'}\n`;
          const avgProgress = goalData.aggregations.averageProgress;
          content += `- **Average Progress**: ${typeof avgProgress === 'number' ? avgProgress.toFixed(0) : 'N/A'}%\n`;
        }
        break;
      }

      case 'tax_optimization': {
        const taxData = relevantData.find(d => d.source === 'tax');
        if (taxData?.aggregations) {
          content += `### Tax Summary (YA ${new Date().getFullYear()})\n`;
          content += `- **Reliefs Claimed**: RM ${taxData.aggregations.totalReliefsClaimed?.toLocaleString() || 'N/A'}\n`;
          content += `- **Potential Savings**: RM ${taxData.aggregations.potentialSavings?.toLocaleString() || 'N/A'}\n`;
        }
        break;
      }

      default:
        content += `### Your Financial Data\n`;
        content += `We found ${context.totalRecords} relevant records for your query.\n`;
    }

    return content;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(context: AssembledContext, intentConfidence: number): number {
    const dataScore = Math.min(context.totalRecords / 50, 1) * 0.4;
    const intentScore = intentConfidence * 0.3;
    const sourceScore = (context.metadata.retrieversUsed.length / 5) * 0.3;
    return Math.min(dataScore + intentScore + sourceScore, 1);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof AIClientError) {
      return `${error.code}: ${error.message}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Get detailed error response for users
   */
  private getDetailedErrorResponse(error: unknown): string {
    if (error instanceof AIClientError) {
      // Handle specific AI client errors
      switch (error.code) {
        case 'HTTP_404':
          return `## Configuration Error ⚠️

The AI model endpoint could not be found. This usually means:

1. **For Azure AI Foundry**: The deployment name might be incorrect
   - Go to Settings → AI Settings
   - Verify your endpoint URL (e.g., \`https://your-resource.openai.azure.com\`)
   - Check the model name matches your deployment name exactly

2. **For OpenAI**: Verify your API key is valid

**Need help?** Check your provider's dashboard to confirm the deployment exists.`;

        case 'HTTP_401':
        case 'AUTHENTICATION_ERROR':
          return `## Authentication Error 🔐

Your API key appears to be invalid or expired.

**To fix this:**
1. Go to Settings → AI Settings
2. Enter a new valid API key
3. Save and try again

**Tip**: API keys are sensitive - make sure you copied the full key without extra spaces.`;

        case 'RATE_LIMIT':
          return `## Rate Limit Reached ⏱️

You have made too many requests. Please wait a moment and try again.

**Tips to avoid this:**
- Wait 30 seconds between requests
- Keep questions focused and specific
- Consider upgrading your API plan for higher limits`;

        case 'CONTENT_FILTER':
          return `## Content Filtered 🛡️

Your request was filtered by the AI provider safety systems.

**Try:**
- Rephrasing your question
- Asking about specific financial topics
- Being more specific about what you need help with`;

        default:
          return `## AI Service Error

I encountered an issue connecting to the AI service.

**Error**: ${error.message}
**Code**: ${error.code}

**What you can try:**
1. Check your AI settings configuration
2. Verify your API key and endpoint
3. Try again in a few moments`;
      }
    }

    // Generic error
    return `## Something Went Wrong

I apologize, but I encountered an unexpected issue.

**What you can try:**
1. Refresh the page and try again
2. Check that you have financial data for the time period
3. Rephrase your question to be more specific

If the issue persists, please check your AI configuration in Settings.`;
  }
}

// ============================================
// Factory Function
// ============================================

export function createAgenticRAG(
  client: AIClient,
  config?: Partial<AgentConfig>
): AgenticRAG {
  return new AgenticRAG(client, config);
}
