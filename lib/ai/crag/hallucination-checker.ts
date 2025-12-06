/**
 * Hallucination Checker
 * 
 * Validates LLM responses against retrieved context to detect
 * and correct hallucinations. Ensures responses are grounded
 * in actual user financial data.
 * 
 * Part of the Corrective RAG (CRAG) pipeline.
 */

import { AIClient, ChatMessage, StructuredOutputSchema } from '../clients/types';
import { AssembledContext } from '../retrievers/types';

/**
 * Validation result for a response
 */
export interface ValidationResult {
  isValid: boolean;
  overallScore: number; // 0-1, higher = more grounded
  issues: HallucinationIssue[];
  suggestions: string[];
  groundedClaims: string[];
  ungroundedClaims: string[];
}

/**
 * Individual hallucination issue
 */
export interface HallucinationIssue {
  type: HallucinationType;
  severity: 'low' | 'medium' | 'high';
  claim: string;
  explanation: string;
  suggestedFix?: string;
}

/**
 * Types of hallucination
 */
export type HallucinationType =
  | 'fabricated_data'      // Made up numbers/amounts
  | 'wrong_calculation'    // Incorrect math
  | 'unsupported_claim'    // Claim not in context
  | 'temporal_error'       // Wrong time period
  | 'entity_confusion'     // Mixed up categories/sources
  | 'overgeneralization'   // Unwarranted broad claims
  | 'false_comparison'     // Invalid comparisons
  | 'missing_qualification'; // Missing important caveats

/**
 * LLM output schema for validation
 */
interface ValidationAssessment {
  is_grounded: boolean;
  confidence_score: number;
  issues: Array<{
    type: string;
    severity: string;
    claim: string;
    explanation: string;
    suggested_fix?: string;
  }>;
  grounded_claims: string[];
  ungrounded_claims: string[];
  overall_assessment: string;
}

const VALIDATION_SCHEMA: StructuredOutputSchema<ValidationAssessment> = {
  name: 'HallucinationValidation',
  description: 'Assessment of response groundedness in context',
  schema: {
    type: 'object',
    properties: {
      is_grounded: {
        type: 'boolean',
        description: 'Whether the response is fully grounded in the context',
      },
      confidence_score: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence that the response is factual (0-1)',
      },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            claim: { type: 'string' },
            explanation: { type: 'string' },
            suggested_fix: { type: 'string' },
          },
        },
        description: 'List of hallucination issues found',
      },
      grounded_claims: {
        type: 'array',
        items: { type: 'string' },
        description: 'Claims that are supported by the context',
      },
      ungrounded_claims: {
        type: 'array',
        items: { type: 'string' },
        description: 'Claims that are NOT supported by the context',
      },
      overall_assessment: {
        type: 'string',
        description: 'Brief summary of the validation',
      },
    },
    required: ['is_grounded', 'confidence_score', 'issues'],
  },
  parse: (json: string) => {
    const parsed = JSON.parse(json);
    return {
      is_grounded: parsed.is_grounded ?? false,
      confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      grounded_claims: Array.isArray(parsed.grounded_claims) ? parsed.grounded_claims : [],
      ungrounded_claims: Array.isArray(parsed.ungrounded_claims) ? parsed.ungrounded_claims : [],
      overall_assessment: parsed.overall_assessment || '',
    };
  },
};

/**
 * System prompt for hallucination checking
 */
const VALIDATION_SYSTEM_PROMPT = `You are an expert fact-checker for a financial assistant. Your task is to validate whether an AI response is grounded in the provided financial context.

CRITICAL: Financial data must be accurate. Fabricated numbers can harm users.

Check for these hallucination types:
1. fabricated_data: Numbers/amounts not in the context
2. wrong_calculation: Incorrect arithmetic
3. unsupported_claim: Statements not backed by data
4. temporal_error: Wrong time periods
5. entity_confusion: Mixed up categories or sources
6. overgeneralization: Unwarranted broad conclusions
7. false_comparison: Invalid comparisons
8. missing_qualification: Missing important caveats

For financial responses, verify:
- All MYR amounts match the context
- Percentages are calculated correctly
- Date ranges are accurate
- Category names are correct
- Trends match the data

Respond with JSON only.`;

/**
 * Hallucination Checker class
 */
export class HallucinationChecker {
  private client: AIClient;
  private strictMode: boolean;
  private minAcceptableScore: number;

  constructor(
    client: AIClient,
    options?: {
      strictMode?: boolean;
      minAcceptableScore?: number;
    }
  ) {
    this.client = client;
    this.strictMode = options?.strictMode ?? true;
    this.minAcceptableScore = options?.minAcceptableScore ?? 0.7;
  }

  /**
   * Validate a response against its context
   */
  async validateResponse(
    response: string,
    context: AssembledContext
  ): Promise<ValidationResult> {
    // Quick check for obvious issues
    const quickCheck = this.quickValidation(response, context);
    if (quickCheck.issues.length > 0 && quickCheck.overallScore < 0.5) {
      return quickCheck;
    }

    // Full LLM-based validation
    try {
      const contextSummary = this.prepareContextSummary(context);

      const messages: ChatMessage[] = [
        { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CONTEXT (Ground Truth):
${contextSummary}

RESPONSE TO VALIDATE:
${response}

Validate whether this response is grounded in the context. Check all numerical claims, percentages, and conclusions. Respond with JSON.`,
        },
      ];

      let assessment: ValidationAssessment;

      if (this.client.chatStructured) {
        assessment = await this.client.chatStructured(
          messages,
          VALIDATION_SCHEMA,
          { temperature: 0, maxTokens: 1000 }
        );
      } else {
        const llmResponse = await this.client.chat(messages, {
          temperature: 0,
          maxTokens: 1000,
          responseFormat: 'json_object',
        });
        assessment = VALIDATION_SCHEMA.parse(llmResponse.content);
      }

      // Convert to ValidationResult
      const issues: HallucinationIssue[] = assessment.issues.map((issue) => ({
        type: this.mapIssueType(issue.type),
        severity: issue.severity as 'low' | 'medium' | 'high',
        claim: issue.claim,
        explanation: issue.explanation,
        suggestedFix: issue.suggested_fix,
      }));

      // Generate suggestions based on issues
      const suggestions = this.generateSuggestions(issues, context);

      const isValid = this.strictMode
        ? assessment.is_grounded && assessment.confidence_score >= this.minAcceptableScore
        : assessment.confidence_score >= this.minAcceptableScore;

      return {
        isValid,
        overallScore: assessment.confidence_score,
        issues,
        suggestions,
        groundedClaims: assessment.grounded_claims,
        ungroundedClaims: assessment.ungrounded_claims,
      };
    } catch (error) {
      console.error('LLM validation failed:', error);
      // Fall back to quick validation
      return quickCheck;
    }
  }

  /**
   * Quick validation without LLM call
   */
  private quickValidation(
    response: string,
    context: AssembledContext
  ): ValidationResult {
    const issues: HallucinationIssue[] = [];

    // Extract amounts from response
    const amountPattern = /RM\s*[\d,]+(?:\.\d{2})?|\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:MYR|ringgit)/gi;
    const responseAmounts = response.match(amountPattern) || [];

    // Extract amounts from context
    const contextStr = JSON.stringify(context);
    const contextAmounts = contextStr.match(amountPattern) || [];
    const contextAmountSet = new Set(contextAmounts.map((a) => this.normalizeAmount(a)));

    // Check if response amounts are in context
    for (const amount of responseAmounts) {
      const normalized = this.normalizeAmount(amount);
      if (normalized > 0 && !this.amountExistsInContext(normalized, contextAmountSet)) {
        issues.push({
          type: 'fabricated_data',
          severity: 'high',
          claim: `Amount: ${amount}`,
          explanation: 'This amount was not found in the retrieved data',
        });
      }
    }

    // Check for percentage claims
    const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;
    const percentMatches = [...response.matchAll(percentPattern)];

    for (const match of percentMatches) {
      const percent = parseFloat(match[1]);
      // Check if it's a reasonable percentage (not obviously hallucinated)
      if (percent > 1000 || (percent > 100 && !response.toLowerCase().includes('increase'))) {
        issues.push({
          type: 'wrong_calculation',
          severity: 'medium',
          claim: `${percent}%`,
          explanation: 'Percentage seems unreasonably high',
        });
      }
    }

    // Check for temporal consistency
    if (context.dateRange) {
      const contextPeriod = context.dateRange.label?.toLowerCase() || '';
      
      // Check if response mentions different time periods
      const timePeriods = ['last year', 'next year', 'yesterday', 'tomorrow'];
      for (const period of timePeriods) {
        if (response.toLowerCase().includes(period) && !contextPeriod.includes(period)) {
          issues.push({
            type: 'temporal_error',
            severity: 'medium',
            claim: `Reference to "${period}"`,
            explanation: `Context is for "${contextPeriod}", but response mentions different period`,
          });
        }
      }
    }

    // Calculate score based on issues
    let score = 1;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          score -= 0.3;
          break;
        case 'medium':
          score -= 0.15;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    }
    score = Math.max(0, score);

    return {
      isValid: issues.filter((i) => i.severity === 'high').length === 0 && score >= this.minAcceptableScore,
      overallScore: score,
      issues,
      suggestions: this.generateSuggestions(issues, context),
      groundedClaims: [],
      ungroundedClaims: issues.map((i) => i.claim),
    };
  }

  /**
   * Normalize an amount string to a number
   */
  private normalizeAmount(amount: string): number {
    const cleaned = amount.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Check if an amount exists in context with some tolerance
   */
  private amountExistsInContext(amount: number, contextAmounts: Set<number>): boolean {
    if (amount === 0) return true;
    
    // Exact match
    if (contextAmounts.has(amount)) return true;

    // Check with 1% tolerance
    for (const contextAmount of contextAmounts) {
      if (Math.abs(amount - contextAmount) / contextAmount < 0.01) {
        return true;
      }
    }

    return false;
  }

  /**
   * Prepare a summary of context for validation
   */
  private prepareContextSummary(context: AssembledContext): string {
    const parts: string[] = [];

    // Date range
    parts.push(`Date Range: ${context.dateRange.label || 'Not specified'}`);

    // Intent
    parts.push(`Query Intent: ${context.intent}`);

    // Financial summary
    if (context.summaries.financial) {
      parts.push(`Financial Summary: ${context.summaries.financial}`);
    }

    // Key data from each source
    for (const source of context.relevantData) {
      const sourceInfo: string[] = [`\nSource: ${source.source}`];
      sourceInfo.push(`Description: ${source.description}`);
      sourceInfo.push(`Records: ${source.recordCount}`);

      if (source.aggregations) {
        sourceInfo.push('Aggregations:');
        for (const [key, value] of Object.entries(source.aggregations)) {
          sourceInfo.push(`  - ${key}: ${value}`);
        }
      }

      if (source.insights && source.insights.length > 0) {
        sourceInfo.push('Insights:');
        source.insights.slice(0, 5).forEach((insight) => {
          sourceInfo.push(`  - ${insight}`);
        });
      }

      parts.push(sourceInfo.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Generate suggestions for fixing issues
   */
  private generateSuggestions(
    issues: HallucinationIssue[],
    context: AssembledContext
  ): string[] {
    const suggestions: string[] = [];

    const highSeverityCount = issues.filter((i) => i.severity === 'high').length;

    if (highSeverityCount > 0) {
      suggestions.push('Regenerate the response using only data from the context');
    }

    const hasFabricatedData = issues.some((i) => i.type === 'fabricated_data');
    if (hasFabricatedData) {
      suggestions.push('Use only the exact amounts shown in the financial data');
      if (context.relevantData.length > 0) {
        const amounts = context.summaries.financial.match(/RM[\d,]+(?:\.\d{2})?/g);
        if (amounts) {
          suggestions.push(`Available amounts: ${amounts.join(', ')}`);
        }
      }
    }

    const hasTemporalError = issues.some((i) => i.type === 'temporal_error');
    if (hasTemporalError) {
      suggestions.push(`Stick to the time period: ${context.dateRange.label}`);
    }

    const hasCalculationError = issues.some((i) => i.type === 'wrong_calculation');
    if (hasCalculationError) {
      suggestions.push('Double-check all percentage calculations');
    }

    if (issues.length === 0) {
      suggestions.push('Response appears well-grounded in the context');
    }

    return suggestions;
  }

  /**
   * Map issue type string to enum
   */
  private mapIssueType(type: string): HallucinationType {
    const normalized = type.toLowerCase().replace(/\s+/g, '_');
    const validTypes: HallucinationType[] = [
      'fabricated_data',
      'wrong_calculation',
      'unsupported_claim',
      'temporal_error',
      'entity_confusion',
      'overgeneralization',
      'false_comparison',
      'missing_qualification',
    ];

    if (validTypes.includes(normalized as HallucinationType)) {
      return normalized as HallucinationType;
    }

    return 'unsupported_claim';
  }
}

/**
 * Create a hallucination checker
 */
export function createHallucinationChecker(
  client: AIClient,
  options?: {
    strictMode?: boolean;
    minAcceptableScore?: number;
  }
): HallucinationChecker {
  return new HallucinationChecker(client, options);
}
