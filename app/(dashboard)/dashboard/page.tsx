"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Receipt, 
  PiggyBank, 
  CreditCard,
  Bell,
  Zap,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  Plus,
  ArrowRight,
  Sparkles,
  Settings2,
  GripVertical,
  Check,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton-loaders";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { AnimatedProgress, CircularProgress } from "@/components/ui/animated-progress";
import { ExpenseDonutChart } from "@/components/charts";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================
interface DashboardData {
  user: { name: string; email: string; currency: string };
  overview: {
    income: { current: number; change: number; lastMonth: number };
    expenses: { current: number; change: number; lastMonth: number };
    netCashFlow: number;
    savingsRate: number;
    netWorth: number;
  };
  upcomingBills: {
    items: Array<{
      id: string;
      name: string;
      amount: number;
      dueDate: string;
      type: 'subscription' | 'commitment';
      frequency: string;
      icon?: string;
      daysUntil: number;
    }>;
    dueSoon: number;
    overdue: number;
    totalRecurringMonthly: number;
    subscriptionsCount: number;
    commitmentsCount: number;
  };
  budgets: {
    items: Array<{
      id: string;
      categoryName: string;
      categoryColor: string;
      limit: number;
      spent: number;
      remaining: number;
      percentage: number;
      status: 'healthy' | 'warning' | 'exceeded';
    }>;
    total: number;
    exceeded: number;
    warning: number;
    healthy: number;
  };
  creditCards: {
    items: Array<{
      id: string;
      bankName: string;
      cardName: string;
      cardType: string;
      lastFourDigits?: string;
      cardColor?: string;
      creditLimit: number | null;
      monthlySpending: number;
      utilization: number | null;
      paymentDueDay?: number;
      isPrimary: boolean;
    }>;
    totalLimit: number;
    totalSpending: number;
    avgUtilization: number;
  };
  goals: {
    items: Array<{
      id: string;
      name: string;
      category?: string;
      icon?: string;
      color?: string;
      currentAmount: number;
      targetAmount: number;
      remaining: number;
      progress: number;
      deadline?: string;
      daysLeft: number | null;
    }>;
    total: number;
    totalSaved: number;
    totalTarget: number;
  };
  spendingByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: string;
    type: string;
    description?: string;
    vendor?: string;
    date: string;
    category?: { name: string; color: string };
  }>;
  taxDeductions: { 
    total: number; 
    year: number;
    previousYear: number;
    previousYearLabel: number;
    yoyChange: number;
    count: number;
    breakdown: Array<{ category: string; total: number }>;
  };
  healthScore: {
    score: number;
    factors: Array<{ name: string; score: number; status: 'good' | 'warning' | 'poor' }>;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  insights: Array<{
    type: 'success' | 'warning' | 'info' | 'alert';
    message: string;
    action?: string;
  }>;
}

async function fetchDashboardStats(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) {
    if (res.status === 401) throw new Error("Not authenticated");
    throw new Error("Failed to fetch stats");
  }
  const data = await res.json();
  return data.data;
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

// ============================================
// HELPER COMPONENTS
// ============================================
function formatCurrency(amount: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}


function getHealthScoreGradient(score: number) {
  if (score >= 75) return "from-emerald-500 to-teal-500";
  if (score >= 50) return "from-amber-500 to-orange-500";
  return "from-red-500 to-rose-500";
}

// ============================================
// DEFAULT CARD ORDER
// ============================================
const DEFAULT_CARD_ORDER = [
  "health-score",
  "net-cash-flow", 
  "savings-rate",
  "income",
  "expenses",
  "upcoming-bills",
  "budget-health",
  "goals",
  "credit-cards",
  "spending",
  "recent-activity",
  "tax-relief"
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch saved layout
  const { data: savedLayout } = useQuery({
    queryKey: ["dashboard-layout"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/layout");
      if (!res.ok) return { cardOrder: DEFAULT_CARD_ORDER };
      const data = await res.json();
      return data.layout?.cardOrder?.length > 0 
        ? data.layout 
        : { cardOrder: DEFAULT_CARD_ORDER };
    },
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  // Update local state when saved layout is fetched
  React.useEffect(() => {
    if (savedLayout?.cardOrder) {
      setCardOrder(savedLayout.cardOrder);
    }
  }, [savedLayout]);

  // Save layout mutation
  const { mutate: saveLayout, isPending: isSaving } = useMutation({
    mutationFn: async (order: string[]) => {
      const res = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardOrder: order }),
      });
      if (!res.ok) throw new Error("Failed to save layout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
      setHasUnsavedChanges(false);
      setIsEditMode(false);
    },
  });

  // Handle card reorder
  const handleReorder = useCallback((newOrder: string[]) => {
    setCardOrder(newOrder);
    setHasUnsavedChanges(true);
  }, []);

  // Save and exit edit mode
  const handleSave = useCallback(() => {
    saveLayout(cardOrder);
  }, [cardOrder, saveLayout]);

  // Cancel and reset
  const handleCancel = useCallback(() => {
    setCardOrder(savedLayout?.cardOrder || DEFAULT_CARD_ORDER);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  }, [savedLayout]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const { overview, upcomingBills, budgets, creditCards, goals, spendingByCategory, recentTransactions, taxDeductions, healthScore, insights } = stats;

  return (
    <motion.div 
      className="space-y-4 md:space-y-6 pb-safe w-full max-w-full overflow-x-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ============================================ */}
      {/* HEADER + GREETING */}
      {/* ============================================ */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs md:text-sm">
              {new Date().toLocaleDateString("en-MY", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl tracking-tight mt-0.5">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {stats.user.name?.split(" ")[0] || "there"}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {/* Edit Mode Controls */}
            <AnimatePresence mode="wait">
              {isEditMode ? (
                <motion.div 
                  key="edit-controls"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCancel}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving}
                    className="gap-1.5 bg-primary hover:bg-primary/90"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Layout"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="normal-controls"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3"
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditMode(true)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="w-4 h-4" />
                    Customize
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/dashboard/transactions?add=true")}>
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/50 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-muted-foreground">Live</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ============================================ */}
      {/* EDIT MODE BANNER */}
      {/* ============================================ */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <GripVertical className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Customize Dashboard Layout</p>
                <p className="text-xs text-muted-foreground">Drag and drop cards to rearrange your dashboard. Changes will be saved to your account.</p>
              </div>
              <div className="md:hidden flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* ALERTS BAR */}
      {/* ============================================ */}
      {insights.length > 0 && (
        <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {insights.slice(0, 3).map((insight, idx) => (
            <Link 
              key={idx}
              href={insight.action || "#"}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl border shrink-0 transition-all hover:scale-[1.02]",
                insight.type === 'alert' && "bg-red-500/5 border-red-500/20 text-red-500",
                insight.type === 'warning' && "bg-amber-500/5 border-amber-500/20 text-amber-500",
                insight.type === 'success' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-500",
                insight.type === 'info' && "bg-blue-500/5 border-blue-500/20 text-blue-500"
              )}
            >
              {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {insight.type === 'warning' && <Bell className="w-4 h-4 shrink-0" />}
              {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {insight.type === 'info' && <Clock className="w-4 h-4 shrink-0" />}
              <span className="text-sm font-medium whitespace-nowrap">{insight.message}</span>
              {insight.action && <ChevronRight className="w-4 h-4 shrink-0" />}
            </Link>
          ))}
        </motion.div>
      )}

      {/* ============================================ */}
      {/* HERO BENTO GRID */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Financial Health Score - Large Card */}
        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-4 md:row-span-2">
          <Card className="h-full bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden relative">
            <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", getHealthScoreGradient(healthScore.score))} />
            <CardContent className="p-4 md:p-6 h-full flex flex-col justify-between relative z-10">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Financial Health</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", 
                    healthScore.status === 'excellent' && "bg-emerald-500/20 text-emerald-400",
                    healthScore.status === 'good' && "bg-blue-500/20 text-blue-400",
                    healthScore.status === 'fair' && "bg-amber-500/20 text-amber-400",
                    healthScore.status === 'poor' && "bg-red-500/20 text-red-400"
                  )}>
                    {healthScore.status.charAt(0).toUpperCase() + healthScore.status.slice(1)}
                  </span>
                </div>
                <div className="mt-4 md:mt-6 flex justify-center">
                  {/* Responsive CircularProgress - smaller on mobile */}
                  <div className="block md:hidden">
                    <CircularProgress 
                      value={healthScore.score} 
                      max={100} 
                      size={120}
                      strokeWidth={10}
                      color={healthScore.score >= 75 ? "#10b981" : healthScore.score >= 50 ? "#f59e0b" : "#ef4444"}
                      showValue
                      animate
                    />
                  </div>
                  <div className="hidden md:block">
                    <CircularProgress 
                      value={healthScore.score} 
                      max={100} 
                      size={160}
                      strokeWidth={12}
                      color={healthScore.score >= 75 ? "#10b981" : healthScore.score >= 50 ? "#f59e0b" : "#ef4444"}
                      showValue
                      animate
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {healthScore.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{factor.name}</span>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full",
                        factor.status === 'good' && "bg-emerald-500",
                        factor.status === 'warning' && "bg-amber-500",
                        factor.status === 'poor' && "bg-red-500"
                      )} />
                      <span className="text-sm text-white font-medium">{Math.round(factor.score)}/25</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Net Cash Flow - Primary Metric */}
        <motion.div variants={itemVariants} className="col-span-6 lg:col-span-4">
          <Card className="h-full bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40 transition-colors">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Cash Flow</p>
                  <p className={cn("text-xl md:text-3xl font-bold tracking-tight mt-1 md:mt-2", 
                    overview.netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {overview.netCashFlow >= 0 ? "+" : ""}{formatCurrency(overview.netCashFlow)}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">This month</p>
                </div>
                <div className={cn("p-2 md:p-3 rounded-lg md:rounded-xl", overview.netCashFlow >= 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
                  <TrendingUp className={cn("w-5 h-5 md:w-6 md:h-6", overview.netCashFlow >= 0 ? "text-emerald-500" : "text-red-500 rotate-180")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Savings Rate */}
        <motion.div variants={itemVariants} className="col-span-6 lg:col-span-4">
          <Card className="h-full bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Savings Rate</p>
                  <p className="text-xl md:text-3xl font-bold tracking-tight mt-1 md:mt-2">{overview.savingsRate.toFixed(1)}%</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">Of income saved</p>
                </div>
                <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-cyan-500/10">
                  <PiggyBank className="w-5 h-5 md:w-6 md:h-6 text-cyan-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Income Card */}
        <motion.div variants={itemVariants} className="col-span-6 lg:col-span-4">
          <Card className="h-full hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/20 transition-all touch-scale">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="p-2 md:p-2.5 rounded-lg bg-emerald-500/10 shrink-0">
                    <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Income</p>
                    <p className="text-lg md:text-xl font-bold truncate">{formatCurrency(overview.income.current)}</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-0.5 text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shrink-0",
                  overview.income.change >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {overview.income.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(overview.income.change).toFixed(0)}%
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expenses Card */}
        <motion.div variants={itemVariants} className="col-span-6 lg:col-span-4">
          <Card className="h-full hover:shadow-lg hover:shadow-rose-500/5 hover:border-rose-500/20 transition-all touch-scale">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="p-2 md:p-2.5 rounded-lg bg-rose-500/10 shrink-0">
                    <Receipt className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Expenses</p>
                    <p className="text-lg md:text-xl font-bold truncate">{formatCurrency(overview.expenses.current)}</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-0.5 text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shrink-0",
                  overview.expenses.change <= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {overview.expenses.change <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {Math.abs(overview.expenses.change).toFixed(0)}%
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* SECONDARY GRID - Upcoming Bills & Budgets */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Upcoming Bills */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Bell className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Upcoming Bills</CardTitle>
                  <p className="text-xs text-muted-foreground">{upcomingBills.items.length} due this month</p>
                </div>
              </div>
              <Link href="/dashboard/subscriptions" className="text-xs text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBills.items.length > 0 ? (
                upcomingBills.items.slice(0, 4).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                        bill.type === 'subscription' ? "bg-violet-500/10" : "bg-blue-500/10"
                      )}>
                        {bill.icon || (bill.type === 'subscription' ? '📱' : '📄')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{bill.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{bill.frequency}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(bill.amount)}</p>
                      <p className={cn("text-xs",
                        bill.daysUntil < 0 ? "text-red-500 font-medium" :
                        bill.daysUntil <= 3 ? "text-amber-500" : "text-muted-foreground"
                      )}>
                        {bill.daysUntil < 0 ? `${Math.abs(bill.daysUntil)}d overdue` :
                         bill.daysUntil === 0 ? "Due today" :
                         bill.daysUntil === 1 ? "Due tomorrow" :
                         `In ${bill.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No upcoming bills
                </div>
              )}
              {upcomingBills.totalRecurringMonthly > 0 && (
                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly recurring</span>
                  <span className="text-sm font-semibold">{formatCurrency(upcomingBills.totalRecurringMonthly)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Budget Health */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Wallet className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Budget Health</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {budgets.healthy} on track, {budgets.warning + budgets.exceeded} need attention
                  </p>
                </div>
              </div>
              <Link href="/dashboard/budgets" className="text-xs text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.items.length > 0 ? (
                budgets.items.slice(0, 4).map((budget) => (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                        <span className="font-medium">{budget.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded",
                          budget.status === 'exceeded' && "bg-red-500/10 text-red-500",
                          budget.status === 'warning' && "bg-amber-500/10 text-amber-500",
                          budget.status === 'healthy' && "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {budget.status === 'exceeded' ? 'Over' : budget.status === 'warning' ? `${budget.percentage.toFixed(0)}%` : `${budget.percentage.toFixed(0)}%`}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full",
                          budget.status === 'exceeded' && "bg-red-500",
                          budget.status === 'warning' && "bg-amber-500",
                          budget.status === 'healthy' && "bg-emerald-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No budgets set</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/dashboard/budgets?add=true")}>
                    <Plus className="w-4 h-4 mr-2" /> Create Budget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* THIRD ROW - Goals, Credit Cards, Spending */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Active Goals */}
        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 md:px-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10">
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <CardTitle className="text-sm md:text-base font-semibold">Goals</CardTitle>
              </div>
              <Link href="/dashboard/goals" className="text-xs text-primary hover:underline touch-target-sm flex items-center justify-center">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
              {goals.items.length > 0 ? (
                goals.items.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[150px]">{goal.name}</span>
                      <span className="text-xs text-muted-foreground">{goal.progress.toFixed(0)}%</span>
                    </div>
                    <AnimatedProgress 
                      value={goal.progress} 
                      max={100} 
                      size="sm"
                      color={goal.progress >= 100 ? "success" : goal.progress >= 50 ? "default" : "warning"}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <span>{formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">No active goals</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/dashboard/goals?add=true")}>
                    <Plus className="w-4 h-4 mr-2" /> Add Goal
                  </Button>
                </div>
              )}
              {goals.items.length > 0 && (
                <div className="pt-3 mt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total saved</span>
                    <span className="font-semibold text-emerald-500">{formatCurrency(goals.totalSaved)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Cards */}
        <motion.div variants={itemVariants} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 md:px-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                </div>
                <CardTitle className="text-sm md:text-base font-semibold">Credit Cards</CardTitle>
              </div>
              <Link href="/dashboard/credit-cards" className="text-xs text-primary hover:underline touch-target-sm flex items-center justify-center">View all</Link>
            </CardHeader>
            <CardContent className="space-y-3 px-4 md:px-6">
              {creditCards.items.length > 0 ? (
                <>
                  {creditCards.items.slice(0, 2).map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 rounded bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                          <span className="text-[8px] text-white font-medium">{card.cardType}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{card.cardName}</p>
                          <p className="text-xs text-muted-foreground">{card.bankName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(card.monthlySpending)}</p>
                        {card.utilization !== null && (
                          <p className={cn("text-xs",
                            card.utilization > 70 ? "text-red-500" :
                            card.utilization > 30 ? "text-amber-500" : "text-emerald-500"
                          )}>
                            {card.utilization.toFixed(0)}% used
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total this month</span>
                    <span className="font-semibold">{formatCurrency(creditCards.totalSpending)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">No credit cards added</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/dashboard/credit-cards?add=true")}>
                    <Plus className="w-4 h-4 mr-2" /> Add Card
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Spending Breakdown with Donut Chart */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/10 to-orange-500/10">
                  <Zap className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Spending</CardTitle>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
              </div>
              <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline">Details</Link>
            </CardHeader>
            <CardContent className="p-4">
              {spendingByCategory.length > 0 ? (
                <div className="space-y-4">
                  {/* Donut Chart - Compact Mode */}
                  <div className="h-[140px]">
                    <ExpenseDonutChart 
                      data={spendingByCategory.slice(0, 6).map(cat => ({
                        name: cat.categoryName,
                        amount: cat.total,
                      }))}
                      compact
                    />
                  </div>
                  
                  {/* Legend with amounts */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    {spendingByCategory.slice(0, 4).map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-xs text-muted-foreground truncate">{cat.categoryName}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">{formatCurrency(spendingByCategory.reduce((sum, c) => sum + c.total, 0))}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No spending data
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* FOURTH ROW - Recent Activity & Tax */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {/* Recent Transactions */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 md:px-6">
              <CardTitle className="text-sm md:text-base font-semibold">Recent Activity</CardTitle>
              <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline flex items-center gap-1 touch-target-sm justify-center">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="space-y-1">
                {recentTransactions.length > 0 ? (
                  recentTransactions.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 md:py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors touch-feedback">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0",
                          tx.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-muted"
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tx.description || tx.vendor || 'Transaction'}</p>
                          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                            <span>{new Date(tx.date).toLocaleDateString("en-MY", { month: "short", day: "numeric" })}</span>
                            {tx.category && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.category.color }} />
                                  {tx.category.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={cn("text-sm font-semibold shrink-0 ml-2",
                        tx.type === 'income' ? "text-emerald-500" : ""
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent transactions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tax Deductions - Enhanced */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
          <Card className="h-full bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-violet-500/5 border-indigo-500/20 overflow-hidden relative">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            
            <CardContent className="p-4 md:p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Relief YA {taxDeductions.year}</span>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              </div>
              
              <div className="mb-4">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
                  {formatCurrency(taxDeductions.total)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{taxDeductions.count} relief items</span>
                  {taxDeductions.yoyChange !== 0 && (
                    <span className={cn("flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                      taxDeductions.yoyChange > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {taxDeductions.yoyChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(taxDeductions.yoyChange).toFixed(0)}% vs {taxDeductions.previousYearLabel}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Mini breakdown */}
              {taxDeductions.breakdown.length > 0 && (
                <div className="space-y-2 mb-4">
                  {taxDeductions.breakdown.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[140px]">{item.category}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <Link
                href="/dashboard/tax"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors text-indigo-400 touch-target"
              >
                View Full Tax Summary <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* FLOATING ACTION BUTTON - Desktop Only */}
      {/* ============================================ */}
      <div className="hidden md:block">
        <FloatingActionButton
          onAddTransaction={() => router.push("/dashboard/transactions?add=true")}
          onAddGoal={() => router.push("/dashboard/goals?add=true")}
          onAddBudget={() => router.push("/dashboard/budgets?add=true")}
          onAddSubscription={() => router.push("/dashboard/subscriptions?add=true")}
          onAddTaxDeduction={() => router.push("/dashboard/tax?add=true")}
        />
      </div>
    </motion.div>
  );
}
