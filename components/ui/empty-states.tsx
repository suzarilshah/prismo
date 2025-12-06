"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { 
  Plus, 
  ArrowRight, 
  CreditCard, 
  Target, 
  Wallet, 
  Receipt, 
  TrendingUp,
  PiggyBank,
  FileText,
  Calendar,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "minimal" | "illustrated";
  className?: string;
}

const iconAnimation = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const floatAnimation = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  variant = "default",
  className 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        variant === "illustrated" && "py-16",
        className
      )}
    >
      {icon && (
        <motion.div 
          {...iconAnimation}
          className={cn(
            "mb-6 p-4 rounded-2xl",
            variant === "default" && "bg-zinc-800/50 border border-zinc-700/50",
            variant === "illustrated" && "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30"
          )}
        >
          <motion.div {...floatAnimation}>
            {icon}
          </motion.div>
        </motion.div>
      )}
      
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-sm mb-6">{description}</p>
      
      <div className="flex items-center gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all duration-200 hover:scale-105"
          >
            {action.icon || <Plus className="w-4 h-4" />}
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button
            variant="ghost"
            onClick={secondaryAction.onClick}
            className="text-zinc-400 hover:text-white gap-1"
          >
            {secondaryAction.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Pre-built empty states for common scenarios

export function NoTransactionsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Receipt className="w-8 h-8 text-blue-400" />}
      title="No Transactions Yet"
      description="Start tracking your income and expenses to get insights into your spending habits."
      action={{ label: "Add Transaction", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

export function NoSubscriptionsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<CreditCard className="w-8 h-8 text-purple-400" />}
      title="No Subscriptions Yet"
      description="Track your recurring subscriptions to stay on top of monthly payments and avoid surprise charges."
      action={{ label: "Add Subscription", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

export function NoBudgetsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Wallet className="w-8 h-8 text-emerald-400" />}
      title="No Budgets Yet"
      description="Create budgets to control your spending and reach your financial goals faster."
      action={{ label: "Create Budget", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

export function NoGoalsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Target className="w-8 h-8 text-cyan-400" />}
      title="No Goals Yet"
      description="Set financial goals and track your progress. Whether it's saving for a house or building an emergency fund."
      action={{ label: "Create Goal", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

export function NoCommitmentsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="w-8 h-8 text-orange-400" />}
      title="No Commitments Yet"
      description="Track your financial commitments like loans, rent, and installments all in one place."
      action={{ label: "Add Commitment", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

export function NoTaxDeductionsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="w-8 h-8 text-amber-400" />}
      title="No Tax Deductions Yet"
      description="Track your tax-deductible expenses to maximize your LHDN tax relief claims."
      action={{ label: "Add Deduction", onClick: onAdd }}
      variant="illustrated"
    />
  );
}

// Animated Illustration for larger empty states
export function EmptyStateIllustration({ type }: { type: "transactions" | "subscriptions" | "budgets" | "goals" }) {
  const illustrations = {
    transactions: (
      <div className="relative w-48 h-48">
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Receipt className="w-16 h-16 text-blue-400/50" />
        </motion.div>
        <motion.div
          className="absolute top-4 right-8"
          animate={{ y: [-3, 3, -3], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-6 h-6 text-cyan-400/40" />
        </motion.div>
        <motion.div
          className="absolute bottom-8 left-4"
          animate={{ y: [3, -3, 3], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <TrendingUp className="w-5 h-5 text-emerald-400/40" />
        </motion.div>
      </div>
    ),
    subscriptions: (
      <div className="relative w-48 h-48">
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <CreditCard className="w-16 h-16 text-purple-400/50" />
        </motion.div>
      </div>
    ),
    budgets: (
      <div className="relative w-48 h-48">
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <PiggyBank className="w-16 h-16 text-emerald-400/50" />
        </motion.div>
      </div>
    ),
    goals: (
      <div className="relative w-48 h-48">
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ rotate: [0, 10, 0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Target className="w-16 h-16 text-cyan-400/50" />
        </motion.div>
      </div>
    )
  };

  return illustrations[type];
}
