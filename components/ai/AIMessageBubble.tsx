"use client";

/**
 * AI Message Bubble
 * 
 * Renders individual chat messages with:
 * - User/Assistant styling
 * - Markdown rendering
 * - Streaming text animation
 * - Data sources metadata
 * - Copy functionality
 */

import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  User,
  Sparkles,
  Database,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Message } from "@/lib/ai/service";

// =============================================================================
// Types
// =============================================================================

interface AIMessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}

interface MessageMetadataProps {
  message: Message;
}

// =============================================================================
// Markdown Renderer with proper styling
// =============================================================================

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-4 mb-2 text-foreground border-b border-border/50 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold mt-4 mb-2 text-foreground flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-3 mb-1.5 text-foreground/90">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-foreground/90 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 my-2 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-foreground/90">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-primary/80 not-italic font-medium">{children}</em>
          ),
          code: ({ children, className }) => {
            const isCodeBlock = className?.includes("language-");
            if (isCodeBlock) {
              return (
                <code className="block p-4 my-3 rounded-xl bg-muted/80 border border-border/50 text-xs font-mono overflow-x-auto">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 bg-primary/10 rounded text-xs font-mono text-primary font-medium">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/50 pl-4 my-3 py-2 bg-primary/5 rounded-r-lg italic text-foreground/80">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-primary underline decoration-primary/30 hover:decoration-primary transition-colors font-medium" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-4 border-border/50" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
              <table className="min-w-full text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-semibold text-left border-b border-border text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 border-b border-border/30 text-foreground/90">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// =============================================================================
// Message Metadata
// =============================================================================

const MessageMetadata = memo(function MessageMetadata({ message }: MessageMetadataProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!message.dataSources?.length && !message.confidenceScore) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2 pt-2 border-t border-border/50"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Database className="h-3 w-3" />
        <span>Analyzed {message.dataSources?.length || 0} data sources</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 space-y-2"
        >
          {/* Data Sources */}
          <div className="flex flex-wrap gap-1">
            {message.dataSources?.map((source) => (
              <Badge
                key={source}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {formatDataSource(source)}
              </Badge>
            ))}
          </div>

          {/* Confidence */}
          {message.confidenceScore && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Confidence:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    message.confidenceScore >= 0.7
                      ? "bg-emerald-500"
                      : message.confidenceScore >= 0.5
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${message.confidenceScore * 100}%` }}
                />
              </div>
              <span>{Math.round(message.confidenceScore * 100)}%</span>
            </div>
          )}

          {/* Processing time */}
          {message.processingTimeMs && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{(message.processingTimeMs / 1000).toFixed(2)}s</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

function formatDataSource(source: string): string {
  const map: Record<string, string> = {
    transactions: "Transactions",
    budgets: "Budgets",
    goals: "Goals",
    subscriptions: "Subscriptions",
    credit_cards: "Credit Cards",
    tax: "Tax Data",
    income: "Income",
    forecasts: "Forecasts",
  };
  return map[source] || source;
}

// =============================================================================
// Streaming Cursor
// =============================================================================

function StreamingCursor() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="inline-block w-2 h-4 bg-primary ml-0.5 rounded-sm"
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const AIMessageBubble = memo(function AIMessageBubble({
  message,
  isStreaming = false,
  streamingContent,
}: AIMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const content = isStreaming && streamingContent ? streamingContent : message.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex gap-3 px-4 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 max-w-[90%]",
          isUser ? "text-right" : "text-left"
        )}
      >
        {/* Role Label */}
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide mb-1.5",
            isUser ? "text-muted-foreground" : "text-primary"
          )}
        >
          {isUser ? "You" : "Prismo AI"}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "inline-block rounded-2xl text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md px-4 py-3"
              : "bg-card text-foreground rounded-tl-md px-5 py-4 border border-border/50 shadow-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <>
              <MarkdownContent content={content} />
              {isStreaming && <StreamingCursor />}
            </>
          )}
        </div>

        {/* Actions (for assistant messages) */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}

        {/* Metadata (for assistant messages) */}
        {!isUser && !isStreaming && <MessageMetadata message={message} />}
      </div>
    </motion.div>
  );
});

export default AIMessageBubble;
