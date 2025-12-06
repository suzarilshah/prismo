"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Archive, ArrowLeft, RotateCcw, Calendar, DollarSign, 
  Home, Car, GraduationCap, Shield, Zap, Receipt, CreditCard,
  Building, Landmark, Wallet, AlertTriangle, Loader2
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

// Commitment type icons
const COMMITMENT_TYPES: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  mortgage: { label: "Mortgage", icon: Home, color: "text-blue-500" },
  car_loan: { label: "Car Loan", icon: Car, color: "text-amber-500" },
  education_loan: { label: "Education Loan", icon: GraduationCap, color: "text-purple-500" },
  credit_card: { label: "Credit Card", icon: CreditCard, color: "text-red-500" },
  insurance: { label: "Insurance", icon: Shield, color: "text-emerald-500" },
  bill: { label: "Utility Bill", icon: Zap, color: "text-yellow-500" },
  rent: { label: "Rent", icon: Building, color: "text-cyan-500" },
  subscription: { label: "Subscription", icon: Receipt, color: "text-pink-500" },
  loan: { label: "Personal Loan", icon: Landmark, color: "text-indigo-500" },
  other: { label: "Other", icon: Wallet, color: "text-gray-500" },
};

interface ArchivedCommitment {
  id: string;
  name: string;
  amount: string;
  commitmentType: string;
  frequency: string;
  terminatedAt: string;
  terminationReason?: string;
  terminationEffectiveDate?: string;
  startDate: string;
  totalPaid: number;
  paymentCount: number;
  category?: { name: string; color: string };
}

async function fetchArchivedCommitments() {
  const res = await fetch("/api/commitments/archived");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function restoreCommitment(commitmentId: string) {
  const res = await fetch("/api/commitments/archived", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitmentId }),
  });
  if (!res.ok) throw new Error("Failed to restore");
  return res.json();
}

export default function ArchivedCommitmentsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["archived-commitments"],
    queryFn: fetchArchivedCommitments,
    enabled: isAuthenticated,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreCommitment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-commitments"] });
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
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
        <LoadingSpinner size="lg" text="Loading archived commitments..." />
      </div>
    );
  }

  const commitments: ArchivedCommitment[] = data?.data?.commitments || [];
  const summary = data?.data?.summary || { totalArchived: 0, totalPaidBeforeTermination: 0 };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/commitments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display font-semibold text-3xl tracking-tight flex items-center gap-3">
              <Archive className="w-8 h-8 text-muted-foreground" />
              Archived Commitments
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and restore terminated commitments
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
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Archived</div>
          </div>
          <div className="font-display font-bold text-2xl">{summary.totalArchived}</div>
        </Card>
        
        <Card className="data-card p-6 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Paid (Before Termination)</div>
          </div>
          <div className="font-display font-bold text-2xl text-emerald-500">
            {formatCurrency(summary.totalPaidBeforeTermination)}
          </div>
        </Card>
      </div>

      {/* Archived List */}
      <Card className="data-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Archived Commitments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {commitments.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-lg font-semibold mb-2">No Archived Commitments</h3>
              <p className="text-sm text-muted-foreground">
                Terminated commitments will appear here
              </p>
            </div>
          ) : (
            commitments.map((commitment) => {
              const typeInfo = COMMITMENT_TYPES[commitment.commitmentType] || COMMITMENT_TYPES.other;
              const TypeIcon = typeInfo.icon;
              
              return (
                <div
                  key={commitment.id}
                  className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:border-border transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <TypeIcon className={`w-5 h-5 ${typeInfo.color} opacity-50`} />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground line-through">{commitment.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{typeInfo.label}</span>
                          <span>•</span>
                          <span>
                            Terminated {new Date(commitment.terminatedAt).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {commitment.terminationReason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &ldquo;{commitment.terminationReason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-display font-semibold text-lg text-muted-foreground">
                          {formatCurrency(commitment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">/ {commitment.frequency}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="font-semibold text-emerald-500">{formatCurrency(commitment.totalPaid)}</p>
                        <p className="text-xs text-muted-foreground">{commitment.paymentCount} payments</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setRestoreId(commitment.id)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Commitment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reactivate the commitment and add it back to your monthly checklist.
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
