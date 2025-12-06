"use client";

/**
 * AI Provider Context
 * 
 * Global state management for the AI assistant.
 * Handles conversations, messages, settings, and streaming.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendMessageStream,
  getConversations,
  createConversation,
  getConversation,
  deleteConversation,
  getAISettings,
  type Conversation,
  type Message,
  type StreamEvent,
  type AISettings,
} from "@/lib/ai/service";

// =============================================================================
// Types
// =============================================================================

interface AIState {
  // Panel state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;

  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  currentMessages: Message[];
  isLoadingConversations: boolean;

  // Settings
  settings: AISettings | null;
  isAIEnabled: boolean;
  isConfigured: boolean;

  // Chat state
  isStreaming: boolean;
  streamingContent: string;
  streamingMetadata: StreamEvent | null;

  // Actions
  selectConversation: (id: string | null) => Promise<void>;
  startNewConversation: () => void;
  sendMessage: (message: string) => Promise<void>;
  deleteConversationById: (id: string) => Promise<void>;
  refreshConversations: () => void;
}

const AIContext = createContext<AIState | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const queryClient = useQueryClient();

  // Panel state
  const [isOpen, setIsOpen] = useState(false);
  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  // Current conversation
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMetadata, setStreamingMetadata] = useState<StreamEvent | null>(null);

  // Abort controller for cancelling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch AI settings
  const { data: settings } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: getAISettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Fetch conversations
  const { data: conversationsData, isLoading: isLoadingConversations, refetch: refreshConversations } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: () => getConversations({ limit: 50 }),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: settings?.aiEnabled ?? false,
  });

  const conversations = conversationsData?.conversations ?? [];

  // Derived state
  const isAIEnabled = settings?.aiEnabled ?? false;
  const isConfigured = isAIEnabled && settings?.hasApiKey;

  // Select a conversation
  const selectConversation = useCallback(async (id: string | null) => {
    if (!id) {
      setCurrentConversationId(null);
      setCurrentMessages([]);
      return;
    }

    try {
      const data = await getConversation(id);
      setCurrentConversationId(id);
      setCurrentMessages(data.messages);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }, []);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setCurrentMessages([]);
    setStreamingContent("");
    setStreamingMetadata(null);
  }, []);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isStreaming) return;

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    
    setCurrentMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingMetadata(null);

    let newConversationId = currentConversationId;

    try {
      await sendMessageStream(message, currentConversationId || undefined, {
        onStart: (conversationId) => {
          newConversationId = conversationId;
          if (!currentConversationId) {
            setCurrentConversationId(conversationId);
          }
        },
        onChunk: (content) => {
          setStreamingContent((prev) => prev + content);
        },
        onMetadata: (metadata) => {
          setStreamingMetadata(metadata);
        },
        onDone: () => {
          // Add the complete assistant message
          setCurrentMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: streamingContent,
              dataSources: streamingMetadata?.dataSources,
              confidenceScore: streamingMetadata?.confidenceScore,
              createdAt: new Date().toISOString(),
            } as Message,
          ]);
          setStreamingContent("");
          setStreamingMetadata(null);
          setIsStreaming(false);
          
          // Refresh conversations list
          queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        },
        onError: (error) => {
          console.error("Stream error:", error);
          setIsStreaming(false);
          setStreamingContent("");
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsStreaming(false);
      // Remove optimistic message on error
      setCurrentMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    }
  }, [currentConversationId, isStreaming, streamingContent, streamingMetadata, queryClient]);

  // Delete conversation
  const deleteConversationById = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      
      if (currentConversationId === id) {
        startNewConversation();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [currentConversationId, startNewConversation, queryClient]);

  const value: AIState = {
    isOpen,
    setIsOpen,
    toggleOpen,
    conversations,
    currentConversationId,
    currentMessages,
    isLoadingConversations,
    settings: settings ?? null,
    isAIEnabled,
    isConfigured: isConfigured ?? false,
    isStreaming,
    streamingContent,
    streamingMetadata,
    selectConversation,
    startNewConversation,
    sendMessage,
    deleteConversationById,
    refreshConversations: () => refreshConversations(),
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// =============================================================================
// Hooks
// =============================================================================

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
}

export function useAIPanel() {
  const { isOpen, setIsOpen, toggleOpen } = useAI();
  return { isOpen, setIsOpen, toggleOpen };
}

export function useAIConversations() {
  const {
    conversations,
    currentConversationId,
    currentMessages,
    isLoadingConversations,
    selectConversation,
    startNewConversation,
    deleteConversationById,
    refreshConversations,
  } = useAI();
  
  return {
    conversations,
    currentConversationId,
    currentMessages,
    isLoading: isLoadingConversations,
    selectConversation,
    startNewConversation,
    deleteConversation: deleteConversationById,
    refresh: refreshConversations,
  };
}

export function useAIChat() {
  const {
    currentMessages,
    isStreaming,
    streamingContent,
    streamingMetadata,
    sendMessage,
  } = useAI();
  
  return {
    messages: currentMessages,
    isStreaming,
    streamingContent,
    streamingMetadata,
    sendMessage,
  };
}

export function useAISettings() {
  const { settings, isAIEnabled, isConfigured } = useAI();
  return { settings, isAIEnabled, isConfigured };
}
