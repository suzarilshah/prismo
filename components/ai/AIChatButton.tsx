"use client";

/**
 * AI Chat Button
 * 
 * Floating action button to open the AI chat panel.
 * Features:
 * - Pulse animation when AI is available
 * - Tooltip with keyboard shortcut
 * - Responsive positioning
 */

import React, { useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAIPanel, useAISettings } from "./AIProvider";
import { Sparkles, X } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface AIChatButtonProps {
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export const AIChatButton = memo(function AIChatButton({
  className,
}: AIChatButtonProps) {
  const { isOpen, toggleOpen } = useAIPanel();
  const { isAIEnabled, isConfigured } = useAISettings();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleOpen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleOpen]);

  // Don't render if AI is not enabled
  if (!isAIEnabled) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleOpen}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "w-14 h-14 rounded-2xl",
        "bg-gradient-to-br from-violet-500 to-purple-600",
        "text-white shadow-lg shadow-violet-500/25",
        "flex items-center justify-center",
        "hover:shadow-xl hover:shadow-violet-500/30",
        "transition-shadow duration-200",
        "group",
        className
      )}
      aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
    >
      {/* Pulse Ring (when configured) */}
      {isConfigured && !isOpen && (
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-2xl bg-violet-500"
        />
      )}

      {/* Icon */}
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="h-6 w-6" />
          </motion.div>
        ) : (
          <motion.div
            key="sparkles"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles className="h-6 w-6" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <div
        className={cn(
          "absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg",
          "bg-foreground text-background text-xs font-medium",
          "opacity-0 scale-95 pointer-events-none",
          "group-hover:opacity-100 group-hover:scale-100",
          "transition-all duration-200",
          "whitespace-nowrap"
        )}
      >
        <span>Ask Prismo AI</span>
        <span className="ml-2 opacity-60">⌘K</span>
        {/* Tooltip arrow */}
        <div
          className={cn(
            "absolute top-full right-4 w-0 h-0",
            "border-l-4 border-r-4 border-t-4",
            "border-l-transparent border-r-transparent border-t-foreground"
          )}
        />
      </div>

      {/* Badge for unconfigured state */}
      {!isConfigured && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center"
        >
          <span className="text-[10px] font-bold text-yellow-950">!</span>
        </motion.div>
      )}
    </motion.button>
  );
});

export default AIChatButton;
