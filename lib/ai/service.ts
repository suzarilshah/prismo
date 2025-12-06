/**
 * AI Service Layer
 * 
 * Provides a clean interface for frontend components to interact with
 * the AI assistant. Handles:
 * - API calls to AI endpoints
 * - SSE streaming
 * - Conversation management
 * - Settings management
 */

import { AIProvider } from "./clients/types";

// =============================================================================
// Types
// =============================================================================

export interface AISettings {
  aiEnabled: boolean;
  provider: AIProvider;
  modelEndpoint?: string;
  modelName?: string;
  temperature: number;
  maxTokens: number;
  enableCrag: boolean;
  relevanceThreshold: number;
  maxRetrievalDocs: number;
  enableWebSearchFallback: boolean;
  dataAccess: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    subscriptions: boolean;
    creditCards: boolean;
    taxData: boolean;
    income: boolean;
    forecasts: boolean;
  };
  anonymizeVendors: boolean;
  excludeSensitiveCategories: string[];
  hasApiKey: boolean;
  maskedApiKey?: string;
}

export interface Conversation {
  id: string;
  title: string;
  totalMessages: number;
  totalTokensUsed: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    preview: string;
    role: string;
    createdAt: string;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  retrievedData?: {
    tables: string[];
    recordCount: number;
    summary?: string;
  };
  dataSources?: string[];
  confidenceScore?: number;
  tokensUsed?: number;
  processingTimeMs?: number;
  queryRewritten?: boolean;
  originalQuery?: string;
  createdAt: string;
}

export interface ChatResponse {
  conversationId: string;
  message: {
    role: "assistant";
    content: string;
  };
  metadata: {
    intent: string;
    dataSources: string[];
    confidenceScore: number;
    queryRewritten: boolean;
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface StreamEvent {
  type: "start" | "chunk" | "metadata" | "done" | "error";
  conversationId?: string;
  content?: string;
  message?: string;
  intent?: string;
  dataSources?: string[];
  confidenceScore?: number;
  queryRewritten?: boolean;
  tokensUsed?: number;
  latencyMs?: number;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = "/api/ai";

/**
 * Fetch AI settings
 */
export async function getAISettings(): Promise<AISettings> {
  const response = await fetch(`${API_BASE}/settings`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch AI settings");
  }
  
  return data.data;
}

/**
 * Update AI settings
 */
export async function updateAISettings(
  settings: Partial<AISettings> & { apiKey?: string }
): Promise<AISettings> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to update AI settings");
  }
  
  return data.data;
}

/**
 * Test AI connection
 */
export async function testAIConnection(config: {
  provider: AIProvider;
  modelEndpoint: string;
  modelName: string;
  apiKey?: string;
}): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  modelInfo?: any;
}> {
  const response = await fetch(`${API_BASE}/test-connection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Connection test failed");
  }
  
  return data.data;
}

/**
 * Fetch conversations
 */
export async function getConversations(options?: {
  page?: number;
  limit?: number;
  includeArchived?: boolean;
}): Promise<{
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.includeArchived) params.set("includeArchived", "true");
  
  const response = await fetch(`${API_BASE}/conversations?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch conversations");
  }
  
  return data.data;
}

/**
 * Create a new conversation
 */
export async function createConversation(options?: {
  title?: string;
  initialMessage?: string;
}): Promise<{
  id: string;
  title: string;
  createdAt: string;
}> {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to create conversation");
  }
  
  return data.data;
}

/**
 * Get conversation with messages
 */
export async function getConversation(
  conversationId: string,
  options?: {
    page?: number;
    limit?: number;
    order?: "asc" | "desc";
  }
): Promise<{
  conversation: Conversation;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.order) params.set("order", options.order);
  
  const response = await fetch(`${API_BASE}/conversations/${conversationId}?${params}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch conversation");
  }
  
  return data.data;
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    title?: string;
    isArchived?: boolean;
  }
): Promise<{
  id: string;
  title: string;
  isArchived: boolean;
  updatedAt: string;
}> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to update conversation");
  }
  
  return data.data;
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete conversation");
  }
}

/**
 * Send a chat message (non-streaming)
 */
export async function sendMessage(
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationId,
      stream: false,
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Failed to send message");
  }
  
  return data.data;
}

/**
 * Send a chat message with streaming
 */
export async function sendMessageStream(
  message: string,
  conversationId: string | undefined,
  callbacks: {
    onStart?: (conversationId: string) => void;
    onChunk?: (content: string) => void;
    onMetadata?: (metadata: StreamEvent) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationId,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to send message");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.replace("data: ", "");
        if (!data) continue;

        try {
          const event: StreamEvent = JSON.parse(data);

          switch (event.type) {
            case "start":
              callbacks.onStart?.(event.conversationId || "");
              break;
            case "chunk":
              callbacks.onChunk?.(event.content || "");
              break;
            case "metadata":
              callbacks.onMetadata?.(event);
              break;
            case "done":
              callbacks.onDone?.();
              break;
            case "error":
              callbacks.onError?.(event.message || "Unknown error");
              break;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// =============================================================================
// Suggested Prompts
// =============================================================================

export const SUGGESTED_PROMPTS = [
  {
    category: "Spending",
    prompts: [
      "Where am I spending the most money?",
      "How does my spending compare to last month?",
      "What are my biggest expenses this month?",
    ],
  },
  {
    category: "Budget",
    prompts: [
      "Am I staying within my budgets?",
      "Which categories are over budget?",
      "How can I improve my budget adherence?",
    ],
  },
  {
    category: "Tax",
    prompts: [
      "How can I maximize my tax deductions?",
      "What tax reliefs am I missing?",
      "Am I going to get a tax refund?",
    ],
  },
  {
    category: "Goals",
    prompts: [
      "How am I progressing on my savings goals?",
      "When will I reach my goal?",
      "How much more do I need to save?",
    ],
  },
  {
    category: "Subscriptions",
    prompts: [
      "How much am I spending on subscriptions?",
      "Which subscriptions can I cancel?",
      "Are there any unused subscriptions?",
    ],
  },
  {
    category: "Credit Cards",
    prompts: [
      "What's my credit utilization?",
      "Which card should I use for shopping?",
      "When are my card payments due?",
    ],
  },
];

/**
 * Get random suggested prompts
 */
export function getRandomPrompts(count: number = 4): string[] {
  const allPrompts = SUGGESTED_PROMPTS.flatMap((cat) => cat.prompts);
  const shuffled = allPrompts.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
