"use client";

/**
 * AI Chat Panel - Premium $100B App Design
 * 
 * Features:
 * - Slide-out panel with conversation controls
 * - Chat history with delete functionality
 * - Message list with rich markdown
 * - Quick action suggestions
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
  MoreHorizontal,
  Clock,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
// Conversation History Sidebar - Premium Design
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

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-20 bg-background/95 backdrop-blur-xl border-r border-border"
    >
      {/* History Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Chat History</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-muted" 
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[calc(100%-56px)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new chat to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {conversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  onClick={() => {
                    selectConversation(conv.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                    "hover:bg-muted/70",
                    currentConversationId === conv.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "bg-muted/30 border border-transparent"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    currentConversationId === conv.id 
                      ? "bg-primary/20" 
                      : "bg-muted"
                  )}>
                    <MessageSquare className={cn(
                      "h-4 w-4",
                      currentConversationId === conv.id 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium truncate pr-8">
                      {conv.title || "New Conversation"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {conv.totalMessages} messages
                      </span>
                      {conv.updatedAt && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete Button - Always visible */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
