/**
 * AI Module Index
 * 
 * Central export for all AI-related functionality.
 * 
 * Architecture:
 * - clients/: AI provider clients (OpenAI, Azure, Anthropic)
 * - crag/: Corrective RAG pipeline components
 * - prompts/: System prompts for different intents
 * - retrievers/: Data retrieval for RAG context
 * - security.ts: API key encryption
 * - service.ts: Frontend API service
 */

// Security utilities
export {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  DEFAULT_AI_SETTINGS,
  type AISettings as AISecuritySettings,
  type AIProviderConfig,
  type AIDataAccessPermissions,
} from "./security";

// AI Clients
export {
  createAIClient,
  createAIClientFromSettings,
  RECOMMENDED_MODELS,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_REQUIREMENTS,
  OpenAIClient,
  AzureOpenAIClient,
  AnthropicClient,
  type AIClient,
  type AIClientConfig,
  type AIProvider,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
  type StreamChunk,
  type TokenUsage,
  AIClientError,
  RateLimitError,
  AuthenticationError,
} from "./clients";

// Intent Classification
export {
  classifyIntent,
  refineIntent,
  isClarifyingQuestion,
  expandQuery,
} from "./intent-classifier";

// Context Assembly
export {
  assembleContext,
  formatContextForLLM,
  mergeContexts,
} from "./context-assembler";

// CRAG Pipeline
export {
  RelevanceGrader,
  createRelevanceGrader,
  QueryRewriter,
  createQueryRewriter,
  HallucinationChecker,
  createHallucinationChecker,
  CRAGOrchestrator,
  createCRAGOrchestrator,
  type GradingResult,
  type AggregatedGradingResult,
  type QueryRewriteResult,
  type ValidationResult,
  type HallucinationIssue,
  type CRAGResponse,
  type CRAGMetadata,
  type CRAGConfig,
} from "./crag";

// Retrievers
export {
  getRetriever,
  getRetrieverNames,
  getAllRetrievers,
  getRetrieversForIntent,
  RETRIEVER_METADATA,
  INTENT_METADATA,
  getSuggestedPrompts,
  getAllSuggestedPrompts,
  type RetrieverName,
  type DataRetriever,
  type RetrievedData,
  type QueryIntent,
  type QueryAnalysis,
  type AssembledContext,
} from "./retrievers";

// System Prompts
export {
  PRISMO_BASE_PROMPT,
  TAX_ADVISOR_PROMPT,
  SPENDING_ANALYST_PROMPT,
  FINANCIAL_COACH_PROMPT,
  CREDIT_CARD_ADVISOR_PROMPT,
  getSystemPrompt,
} from "./prompts";

// Service Layer (for frontend)
export {
  getAISettings,
  updateAISettings,
  testAIConnection,
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  sendMessage,
  sendMessageStream,
  SUGGESTED_PROMPTS,
  getRandomPrompts,
  type AISettings,
  type Conversation,
  type Message,
  type ChatResponse as ServiceChatResponse,
  type StreamEvent,
} from "./service";
