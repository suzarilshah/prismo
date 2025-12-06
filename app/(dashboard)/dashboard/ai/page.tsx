"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Archive,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Database,
  Clock,
  Zap,
  Settings,
  X,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Target,
  PiggyBank,
  Receipt,
  CreditCard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: {
    intent?: string;
    dataSources?: string[];
    confidenceScore?: number;
    tokensUsed?: number;
    latencyMs?: number;
  };
}

interface Conversation {
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

interface AISettings {
  aiEnabled: boolean;
  provider: string;
  hasApiKey: boolean;
}

// Suggested prompts for new conversations
const SUGGESTED_PROMPTS = [
  {
    icon: TrendingUp,
    title: "Spending Analysis",
    prompt: "Analyze my spending patterns this month and identify areas where I could save money.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Target,
    title: "Goal Progress",
    prompt: "How am I progressing towards my financial goals? Which ones need more attention?",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: PiggyBank,
    title: "Savings Advice",
    prompt: "Based on my income and expenses, how much should I be saving each month?",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Receipt,
    title: "Tax Optimization",
    prompt: "What tax deductions am I eligible for based on my transactions this year?",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: CreditCard,
    title: "Subscription Review",
    prompt: "Review my subscriptions and suggest which ones I might want to cancel or optimize.",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Wallet,
    title: "Budget Health",
    prompt: "How are my budgets performing? Am I on track or overspending in any category?",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

// API Functions
async function fetchAISettings(): Promise<AISettings> {
  const res = await fetch("/api/ai/settings");
  if (!res.ok) throw new Error("Failed to fetch AI settings");
  const data = await res.json();
  return data.data;
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/ai/conversations?limit=50");
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return data.data?.conversations || [];
}

async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/ai/conversations/${conversationId}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  
  // Map API response to Message interface
  const messages = data.data?.messages || [];
  return messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
    metadata: msg.role === 'assistant' ? {
      intent: msg.retrievedData?.summary,
      dataSources: msg.dataSources || [],
      confidenceScore: msg.confidenceScore ? parseFloat(msg.confidenceScore) : undefined,
      tokensUsed: msg.tokensUsed,
      latencyMs: msg.processingTimeMs,
    } : undefined,
  }));
}

async function createConversation(title?: string): Promise<{ id: string }> {
  const res = await fetch("/api/ai/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "New Conversation" }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  const data = await res.json();
  return data.data;
}

async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/ai/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

async function sendMessage(conversationId: string | null, message: string): Promise<any> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      message,
      stream: false, // Non-streaming for simplicity
    }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send message");
  }
  return res.json();
}

// Message Component
function ChatMessage({ message, isLatest }: { message: Message; isLatest?: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group flex gap-3 md:gap-4 px-4 py-6 md:py-8",
        isUser ? "bg-transparent" : "bg-muted/30"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser 
          ? "bg-violet-500/20 text-violet-500" 
          : "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? "You" : "Prismo AI"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Message Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Metadata for AI responses */}
        {!isUser && message.metadata && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
            {message.metadata.dataSources && message.metadata.dataSources.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Sources: {message.metadata.dataSources.join(", ")}
                </span>
              </div>
            )}
            {message.metadata.confidenceScore && (
              <Badge variant="outline" className="text-xs h-5 gap-1">
                <Zap className="w-3 h-3" />
                {(message.metadata.confidenceScore * 100).toFixed(0)}% confidence
              </Badge>
            )}
            {message.metadata.latencyMs && (
              <Badge variant="outline" className="text-xs h-5 gap-1">
                <Clock className="w-3 h-3" />
                {message.metadata.latencyMs}ms
              </Badge>
            )}
          </div>
        )}

        {/* Copy button */}
        {!isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Typing Indicator
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 px-4 py-6 bg-muted/30"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
          className="w-2 h-2 rounded-full bg-muted-foreground"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
          className="w-2 h-2 rounded-full bg-muted-foreground"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
          className="w-2 h-2 rounded-full bg-muted-foreground"
        />
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function AIAssistantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: fetchAISettings,
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: fetchConversations,
    enabled: settings?.aiEnabled && settings?.hasApiKey,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["ai-messages", activeConversationId],
    queryFn: () => fetchMessages(activeConversationId!),
    enabled: !!activeConversationId,
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: string | null; message: string }) =>
      sendMessage(conversationId, message),
    onSuccess: (data) => {
      // Update conversation ID if new
      if (data.data?.conversationId && !activeConversationId) {
        setActiveConversationId(data.data.conversationId);
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.data?.message?.content || "I apologize, but I could not generate a response.",
        createdAt: new Date().toISOString(),
        metadata: data.data?.metadata,
      };
      setLocalMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai-messages", data.data?.conversationId] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setIsTyping(false);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      if (activeConversationId) {
        setActiveConversationId(null);
        setLocalMessages([]);
      }
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  // Effects
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length, isTyping]);

  // Sync remote messages with local state when conversation changes
  // Only update when the conversation ID changes or messages are first loaded
  const messagesKey = messages.map(m => m.id).join(',');
  useEffect(() => {
    if (activeConversationId && messages.length > 0 && localMessages.length === 0) {
      // Only sync when we have no local messages but remote messages exist
      setLocalMessages(messages);
    }
  }, [activeConversationId, messagesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear messages when starting a new conversation
  useEffect(() => {
    if (!activeConversationId) {
      setLocalMessages([]);
    }
  }, [activeConversationId]);

  // Handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;
    
    setError(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setLocalMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    sendMessageMutation.mutate({
      conversationId: activeConversationId,
      message: userMessage.content,
    });
  }, [inputValue, isTyping, activeConversationId, sendMessageMutation]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setLocalMessages([]);
    setError(null);
  };

  const handleSelectConversation = (id: string) => {
    if (id !== activeConversationId) {
      setLocalMessages([]); // Clear local messages first
      setActiveConversationId(id);
      setError(null);
    }
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversationMutation.mutate(id);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  // Loading state
  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  // AI not enabled
  if (!settings?.aiEnabled || !settings?.hasApiKey) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">Enable AI Assistant</h2>
            <p className="text-muted-foreground text-sm">
              {!settings?.aiEnabled 
                ? "The AI assistant is currently disabled. Enable it in settings to get personalized financial insights."
                : "Please add your API key in settings to use the AI assistant."}
            </p>
            <Button onClick={() => router.push("/dashboard/settings")} className="gap-2">
              <Settings className="w-4 h-4" />
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayMessages = localMessages.length > 0 ? localMessages : messages;
  const showWelcome = displayMessages.length === 0 && !isTyping;

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] overflow-hidden -m-4 md:-m-6 lg:-m-8">
      {/* Sidebar - Desktop */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <Button
                onClick={handleNewConversation}
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all",
                        activeConversationId === conv.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage?.preview || "No messages"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Prismo AI</h1>
                <p className="text-xs text-muted-foreground">Your financial assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleNewConversation} className="md:hidden">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          {showWelcome ? (
            <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 max-w-2xl"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Welcome to Prismo AI
                  </h2>
                  <p className="text-muted-foreground">
                    Your intelligent financial assistant. Ask me anything about your finances.
                  </p>
                </div>

                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleSuggestedPrompt(item.prompt)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left group"
                    >
                      <div className={cn("p-2 rounded-lg shrink-0", item.bgColor)}>
                        <item.icon className={cn("w-4 h-4", item.color)} />
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-0.5 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.prompt}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {displayMessages.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  isLatest={idx === displayMessages.length - 1}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-destructive/10 border-t border-destructive/20"
            >
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setError(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  disabled={isTyping}
                  className="min-h-[44px] max-h-[200px] resize-none pr-12 py-3 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                  rows={1}
                />
                <Button
                  size="icon"
                  disabled={!inputValue.trim() || isTyping}
                  onClick={handleSendMessage}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Prismo AI analyzes your financial data to provide personalized insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
