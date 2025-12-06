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
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed text-foreground/90">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 ml-1 text-foreground/90">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 ml-1 text-foreground/90">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground/90">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80">{children}</em>
        ),
        code: ({ children, className }) => {
          const isCodeBlock = className?.includes("language-");
          if (isCodeBlock) {
            return (
              <code className="block p-3 my-2 rounded-lg bg-muted/80 text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          }
          return (
            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-primary">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 bg-muted/50 font-semibold text-left border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border/50">{children}</td>
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
        "group flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
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
          "flex-1 max-w-[85%]",
          isUser ? "text-right" : "text-left"
        )}
      >
        {/* Role Label */}
        <div
          className={cn(
            "text-xs font-medium mb-1",
            isUser ? "text-muted-foreground" : "text-primary"
          )}
        >
          {isUser ? "You" : "Prismo AI"}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/50 text-foreground rounded-tl-sm border border-border/50"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <>
              <MarkdownContent content={content} />
              {isStreaming && <StreamingCursor />}
            </>
          )}
        </div>

        {/* Actions (for assistant messages) */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
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
