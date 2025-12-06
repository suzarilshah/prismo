"use client";

/**
 * AI Chat Panel
 * 
 * Slide-out panel containing:
 * - Header with conversation controls
 * - Message list
 * - Chat input
 * - Conversation history sidebar
 */

import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAI, useAIPanel, useAIConversations, useAISettings } from "./AIProvider";
import { AIChatMessages } from "./AIChatMessages";
import { AIChatInput } from "./AIChatInput";
import {
  X,
  Plus,
  MessageSquare,
  Settings,
  History,
  ChevronLeft,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface AIChatPanelProps {
  className?: string;
}

// =============================================================================
// Panel Header
// =============================================================================

function PanelHeader({
  showHistory,
  onToggleHistory,
  onNewChat,
  onClose,
}: {
  showHistory: boolean;
  onToggleHistory: () => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Prismo AI</h2>
          <p className="text-xs text-muted-foreground">Financial Assistant</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewChat}
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleHistory}
          title="Chat History"
        >
          <History className="h-4 w-4" />
        </Button>
        <Link href="/settings/ai">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="AI Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-4 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Conversation History Sidebar
// =============================================================================

function ConversationHistory({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const {
    conversations,
    currentConversationId,
    selectConversation,
    deleteConversation,
    isLoading,
  } = useAIConversations();

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="absolute inset-0 z-10 bg-background"
    >
      {/* History Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="text-sm font-semibold">Chat History</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[calc(100%-49px)]">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group"
              >
                <button
                  onClick={() => {
                    selectConversation(conv.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-start gap-2 p-2 rounded-lg text-left",
                    "hover:bg-muted/50 transition-colors",
                    currentConversationId === conv.id && "bg-muted"
                  )}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title || "New Conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.totalMessages} messages
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}

// =============================================================================
// Not Configured State
// =============================================================================

function NotConfiguredState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-yellow-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">AI Not Configured</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        To use Prismo AI, please configure your AI settings with an API key
        from OpenAI, Azure, or Anthropic.
      </p>
      <Link href="/settings/ai">
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Configure AI Settings
        </Button>
      </Link>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const AIChatPanel = memo(function AIChatPanel({
  className,
}: AIChatPanelProps) {
  const { isOpen, setIsOpen } = useAIPanel();
  const { startNewConversation } = useAIConversations();
  const { isConfigured } = useAISettings();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 right-0 h-full w-full sm:w-[420px] z-50",
              "bg-background border-l border-border/50",
              "shadow-2xl flex flex-col",
              className
            )}
          >
            {/* Header */}
            <PanelHeader
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(!showHistory)}
              onNewChat={() => {
                startNewConversation();
                setShowHistory(false);
              }}
              onClose={() => setIsOpen(false)}
            />

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* History Sidebar */}
              <AnimatePresence>
                {showHistory && (
                  <ConversationHistory
                    isVisible={showHistory}
                    onClose={() => setShowHistory(false)}
                  />
                )}
              </AnimatePresence>

              {/* Main Chat Area */}
              {isConfigured ? (
                <>
                  <AIChatMessages className="flex-1" />
                  <AIChatInput />
                </>
              ) : (
                <NotConfiguredState />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default AIChatPanel;
