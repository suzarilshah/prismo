"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Archive, ArrowLeft, RotateCcw, Calendar, DollarSign, 
  CreditCard, Loader2, Music, Video, Cloud, Gamepad2,
  BookOpen, Dumbbell, ShoppingBag, Heart, Sparkles, Globe
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Subscription icons mapping
const SUBSCRIPTION_ICONS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  "🎵": { label: "Music", icon: Music },
  "🎬": { label: "Streaming", icon: Video },
  "☁️": { label: "Cloud Storage", icon: Cloud },
  "🎮": { label: "Gaming", icon: Gamepad2 },
  "📚": { label: "Education", icon: BookOpen },
  "💪": { label: "Fitness", icon: Dumbbell },
  "🛒": { label: "Shopping", icon: ShoppingBag },
  "💖": { label: "Lifestyle", icon: Heart },
  "✨": { label: "Premium", icon: Sparkles },
  "🌐": { label: "Software", icon: Globe },
  "📦": { label: "Other", icon: CreditCard },
};

interface ArchivedSubscription {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  icon?: string;
  planTier?: string;
  terminatedAt: string;
  terminationReason?: string;
  startDate: string;
  website?: string;
}

async function fetchArchivedSubscriptions() {
  const res = await fetch("/api/subscriptions/archived");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function restoreSubscription(subscriptionId: string) {
  const res = await fetch("/api/subscriptions/archived", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Failed to restore");
  return res.json();
}

export default function ArchivedSubscriptionsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["archived-subscriptions"],
    queryFn: fetchArchivedSubscriptions,
    enabled: isAuthenticated,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setRestoreId(null);
    },
  });

  const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading archived subscriptions..." />
      </div>
    );
  }

  const subscriptions: ArchivedSubscription[] = data?.data?.subscriptions || [];
  const summary = data?.data?.summary || { totalArchived: 0, totalSaved: 0 };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/subscriptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display font-semibold text-3xl tracking-tight flex items-center gap-3">
              <Archive className="w-8 h-8 text-muted-foreground" />
              Cancelled Subscriptions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and restore cancelled subscriptions
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="data-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Archive className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Cancelled</div>
          </div>
          <div className="font-display font-bold text-2xl">{summary.totalArchived}</div>
        </Card>
        
        <Card className="data-card p-6 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Monthly Savings</div>
          </div>
          <div className="font-display font-bold text-2xl text-emerald-500">
            {formatCurrency(summary.totalSaved)}
          </div>
        </Card>
      </div>

      {/* Archived List */}
      <Card className="data-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Cancelled Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-lg font-semibold mb-2">No Cancelled Subscriptions</h3>
              <p className="text-sm text-muted-foreground">
                Cancelled subscriptions will appear here
              </p>
            </div>
          ) : (
            subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:border-border transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl opacity-50">
                      {subscription.icon || "📦"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-muted-foreground line-through">{subscription.name}</p>
                        {subscription.planTier && (
                          <Badge variant="outline" className="text-xs opacity-50">{subscription.planTier}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          Cancelled {new Date(subscription.terminatedAt).toLocaleDateString("en-MY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {subscription.terminationReason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &ldquo;{subscription.terminationReason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-display font-semibold text-lg text-muted-foreground">
                        {formatCurrency(subscription.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">/ {subscription.frequency}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setRestoreId(subscription.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reactivate the subscription and add it back to your monthly checklist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreId && restoreMutation.mutate(restoreId)}
            >
              {restoreMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
