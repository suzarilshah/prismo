"use client";

import { cn } from "@/lib/utils";

// Base skeleton with shimmer animation
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-zinc-800/50",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-zinc-700/30 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-xl p-6", height)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t" 
            style={{ height: `${Math.random() * 60 + 20}%` }} 
          />
        ))}
      </div>
    </div>
  );
}

// Transaction list skeleton
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

// Goal card skeleton
export function GoalCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Budget card skeleton
export function BudgetCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-12 rounded-md" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-zinc-800">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40" : "w-24")} />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-zinc-800/50 last:border-0">
          {[...Array(cols)].map((_, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-4", colIndex === 0 ? "w-40" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Dashboard skeleton - full page
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Main Chart */}
      <ChartSkeleton height="h-96" />

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <TransactionListSkeleton count={4} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <GoalCardSkeleton />
          <BudgetCardSkeleton />
        </div>
      </div>
    </div>
  );
}

// Add shimmer keyframes to global CSS or tailwind config
// @keyframes shimmer {
//   100% { transform: translateX(100%); }
// }
