"use client";

/**
 * AI Chat Messages
 * 
 * Scrollable message list with:
 * - Auto-scroll to bottom on new messages
 * - Streaming message support
 * - Empty state
 * - Loading state
 */

import React, { useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AIMessageBubble } from "./AIMessageBubble";
import { useAIChat } from "./AIProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, MessageCircle } from "lucide-react";
import type { Message } from "@/lib/ai/service";

// =============================================================================
// Types
// =============================================================================

interface AIChatMessagesProps {
  className?: string;
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-violet-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Hi, I'm Prismo AI</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your personal finance assistant. Ask me about your spending, budgets,
        taxes, or anything financial!
      </p>
    </motion.div>
  );
}

// =============================================================================
// Typing Indicator
// =============================================================================

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 px-4 py-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-1 px-4 py-2.5 rounded-2xl rounded-tl-sm bg-muted/50 border border-border/50">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 rounded-full bg-violet-500"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          className="w-2 h-2 rounded-full bg-violet-500"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          className="w-2 h-2 rounded-full bg-violet-500"
        />
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const AIChatMessages = memo(function AIChatMessages({
  className,
}: AIChatMessagesProps) {
  const { messages, isStreaming, streamingContent, streamingMetadata } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className={cn("flex-1 overflow-hidden", className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="flex flex-col min-h-full py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <AIMessageBubble
              key={message.id}
              message={message}
            />
          ))}
        </AnimatePresence>

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <AIMessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              createdAt: new Date().toISOString(),
            }}
            isStreaming={true}
            streamingContent={streamingContent}
          />
        )}

        {/* Typing indicator (before first chunk) */}
        {isStreaming && !streamingContent && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-px" />
      </div>
    </ScrollArea>
  );
});

export default AIChatMessages;
