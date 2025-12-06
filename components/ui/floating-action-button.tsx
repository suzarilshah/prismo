"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Receipt, Target, Wallet, CreditCard, FileText } from "lucide-react";
import { useState } from "react";

interface FloatingActionButtonProps {
  onAddTransaction?: () => void;
  onAddGoal?: () => void;
  onAddBudget?: () => void;
  onAddSubscription?: () => void;
  onAddTaxDeduction?: () => void;
}

const actions = [
  { 
    id: "transaction", 
    label: "Transaction", 
    icon: Receipt, 
    color: "bg-blue-500 hover:bg-blue-600",
    key: "onAddTransaction"
  },
  { 
    id: "goal", 
    label: "Goal", 
    icon: Target, 
    color: "bg-cyan-500 hover:bg-cyan-600",
    key: "onAddGoal"
  },
  { 
    id: "budget", 
    label: "Budget", 
    icon: Wallet, 
    color: "bg-emerald-500 hover:bg-emerald-600",
    key: "onAddBudget"
  },
  { 
    id: "subscription", 
    label: "Subscription", 
    icon: CreditCard, 
    color: "bg-purple-500 hover:bg-purple-600",
    key: "onAddSubscription"
  },
  { 
    id: "tax", 
    label: "Tax Deduction", 
    icon: FileText, 
    color: "bg-amber-500 hover:bg-amber-600",
    key: "onAddTaxDeduction"
  },
];

export function FloatingActionButton(props: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (key: string) => {
    const handler = props[key as keyof FloatingActionButtonProps];
    if (handler) {
      handler();
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3"
            >
              {actions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.3, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: { delay: index * 0.05 }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.3, 
                      y: 20,
                      transition: { delay: (actions.length - index) * 0.05 }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAction(action.key)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-colors",
                      action.color,
                      "text-white font-medium text-sm"
                    )}
                  >
                    <ActionIcon className="w-5 h-5" />
                    <span className="whitespace-nowrap">{action.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
            "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600",
            "text-white transition-all duration-300",
            isOpen && "shadow-blue-500/30 shadow-xl"
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </motion.button>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap"
          >
            Quick Add
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline quick action bar
export function QuickActionBar({ 
  className,
  ...props 
}: FloatingActionButtonProps & { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {actions.slice(0, 4).map((action) => {
        const ActionIcon = action.icon;
        const handler = props[action.key as keyof FloatingActionButtonProps];
        
        return (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handler?.()}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50",
              "text-zinc-300 hover:text-white text-sm font-medium",
              "transition-all duration-200"
            )}
          >
            <ActionIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
