"use client";

/**
 * AI Chat Input
 * 
 * Chat input with:
 * - Auto-resizing textarea
 * - Send button with loading state
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Suggested prompts
 */

import React, { useState, useRef, useCallback, KeyboardEvent, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAIChat, useAIConversations } from "./AIProvider";
import {
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  PiggyBank,
  Receipt,
  Target,
  CreditCard,
  FileText,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface AIChatInputProps {
  className?: string;
  showSuggestions?: boolean;
}

interface SuggestedPrompt {
  icon: React.ReactNode;
  text: string;
  category: string;
}

// =============================================================================
// Suggested Prompts
// =============================================================================

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    icon: <TrendingUp className="h-4 w-4" />,
    text: "How am I spending compared to last month?",
    category: "Spending",
  },
  {
    icon: <PiggyBank className="h-4 w-4" />,
    text: "Am I on track with my savings goals?",
    category: "Goals",
  },
  {
    icon: <Receipt className="h-4 w-4" />,
    text: "What tax deductions am I missing?",
    category: "Tax",
  },
  {
    icon: <CreditCard className="h-4 w-4" />,
    text: "How can I reduce my subscriptions?",
    category: "Subscriptions",
  },
];

function SuggestedPromptsGrid({
  onSelect,
  isVisible,
}: {
  onSelect: (prompt: string) => void;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="grid grid-cols-2 gap-2 mb-3"
    >
      {SUGGESTED_PROMPTS.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(prompt.text)}
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl text-left",
            "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
            "transition-all duration-200",
            "group"
          )}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            {prompt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">
              {prompt.category}
            </p>
            <p className="text-sm text-foreground line-clamp-2">
              {prompt.text}
            </p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const AIChatInput = memo(function AIChatInput({
  className,
  showSuggestions = true,
}: AIChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming, messages } = useAIChat();

  const isFirstMessage = messages.length === 0;
  const canSend = input.trim().length > 0 && !isStreaming;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleSend = async () => {
    if (!canSend) return;

    const message = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionSelect = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
    setTimeout(adjustTextareaHeight, 0);
  };

  return (
    <div className={cn("px-4 pb-4", className)}>
      {/* Suggested Prompts */}
      <AnimatePresence>
        {showSuggestions && isFirstMessage && !isStreaming && (
          <SuggestedPromptsGrid
            onSelect={handleSuggestionSelect}
            isVisible={true}
          />
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="relative">
        <div
          className={cn(
            "flex items-end gap-2 p-2 rounded-2xl",
            "bg-muted/50 border border-border/50",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
            "transition-all duration-200"
          )}
        >
          {/* Prismo Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-0.5">
            <Sparkles className="h-4 w-4 text-violet-500" />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Prismo anything about your finances..."
            disabled={isStreaming}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 outline-none",
              "text-sm placeholder:text-muted-foreground",
              "max-h-[150px] py-2",
              "disabled:opacity-50"
            )}
          />

          {/* Send Button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "h-8 w-8 rounded-lg flex-shrink-0 mb-0.5",
              "bg-primary hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Hint */}
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
});

export default AIChatInput;
