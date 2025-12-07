"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, PieChart, AlertTriangle, CheckCircle2, TrendingUp, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { NoBudgetsEmptyState } from "@/components/ui/empty-states";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { motion } from "framer-motion";

interface Budget {
  id: string;
  categoryId: string;
  amount: string;
  spent: string;
  period: string;
  startDate: string;
  endDate: string;
  alertThreshold: number;
  category?: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
  type: string;
}

async function fetchBudgets() {
  const res = await fetch("/api/budgets");
  if (!res.ok) return [];
  return (await res.json()).data || [];
}

async function fetchCategories() {
  const res = await fetch("/api/categories?type=expense");
  if (!res.ok) return [];
  return (await res.json()).data || [];
}

async function fetchTransactions() {
  const res = await fetch("/api/transactions?limit=1000");
  if (!res.ok) return [];
  return (await res.json()).data || [];
}

async function createBudget(data: Partial<Budget>) {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create budget");
  return res.json();
}

async function updateBudget(id: string, data: Partial<Budget>) {
  const res = await fetch(`/api/budgets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update budget");
  return res.json();
}

async function deleteBudget(id: string) {
  const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete budget");
  return res.json();
}

export default function BudgetsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    period: "monthly",
    alertThreshold: 80,
  });

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      resetForm();
      setIsAddDialogOpen(false);
      toast.success("Budget Created", {
        description: "Your new budget has been set up successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to create budget", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) => updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      resetForm();
      setIsAddDialogOpen(false);
      setEditingBudget(null);
      toast.success("Budget Updated", {
        description: "Your budget has been updated.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update budget", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setDeleteBudgetId(null);
      toast.success("Budget Deleted", {
        description: "The budget has been permanently removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete budget", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFormData({ categoryId: "", amount: "", period: "monthly", alertThreshold: 80 });
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount,
      period: budget.period,
      alertThreshold: budget.alertThreshold,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingBudget(null);
      resetForm();
    }
    setIsAddDialogOpen(open);
  };

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
    enabled: isAuthenticated,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isAuthenticated,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    enabled: isAuthenticated,
  });

  if (loadingBudgets) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading budgets..." />
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  // Calculate spending for each budget
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const budgetsWithSpending = budgets?.map((budget: Budget) => {
    // Calculate actual spending from transactions
    const categoryTransactions = transactions?.filter((tx: any) => 
      tx.categoryId === budget.categoryId && 
      tx.type === "expense" &&
      new Date(tx.date).getMonth() === currentMonth &&
      new Date(tx.date).getFullYear() === currentYear
    ) || [];

    const actualSpent = categoryTransactions.reduce(
      (sum: number, tx: any) => sum + parseFloat(tx.amount),
      0
    );

    const budgetAmount = parseFloat(budget.amount);
    const percentage = (actualSpent / budgetAmount) * 100;
    const remaining = budgetAmount - actualSpent;

    return {
      ...budget,
      actualSpent,
      percentage: Math.min(percentage, 100),
      remaining,
      status: percentage >= 100 ? "exceeded" : percentage >= budget.alertThreshold ? "warning" : "good"
    };
  }) || [];

  const totalBudget = budgetsWithSpending.reduce((sum: number, b: { amount: string }) => sum + parseFloat(b.amount), 0);
  const totalSpent = budgetsWithSpending.reduce((sum: number, b: { actualSpent: number }) => sum + b.actualSpent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">Budgets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })} Budget Overview
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">{editingBudget ? "Edit Budget" : "Create New Budget"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></span>
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monthly Budget (MYR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Alert Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be alerted when spending reaches this percentage
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || !formData.categoryId || !formData.amount}
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingBudget ? "Update Budget" : "Create Budget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Summary */}
      <Card className="data-card p-4 md:p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Overall Budget Status
              </h3>
              <p className="text-2xl md:text-3xl font-display font-bold mt-2">
                {overallPercentage.toFixed(1)}% Used
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl md:text-2xl font-display font-semibold text-primary mt-1">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                of {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
          <Progress value={overallPercentage} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Remaining: {formatCurrency(totalRemaining)}
            </span>
            <span className={`font-semibold ${totalRemaining >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {totalRemaining >= 0 ? "On Track" : "Over Budget"}
            </span>
          </div>
        </div>
      </Card>

      {/* Budget Categories */}
      {budgetsWithSpending.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetsWithSpending.map((budget: any) => (
            <Card key={budget.id} className="data-card p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        budget.status === "exceeded"
                          ? "bg-red-500/10"
                          : budget.status === "warning"
                          ? "bg-yellow-500/10"
                          : "bg-emerald-500/10"
                      }`}
                    >
                      {budget.status === "exceeded" ? (
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      ) : budget.status === "warning" ? (
                        <TrendingUp className="w-6 h-6 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {budget.category?.name || "Unknown Category"}
                      </h3>
                      <p className="text-xs text-muted-foreground">Monthly Budget</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(budget)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteBudgetId(budget.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-semibold">{budget.percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={budget.percentage} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{formatCurrency(budget.actualSpent)}</span>
                    <span className="text-muted-foreground">of {formatCurrency(budget.amount)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Remaining</span>
                    <span
                      className={`text-sm font-semibold ${
                        budget.remaining >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {formatCurrency(budget.remaining)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="data-card">
          <NoBudgetsEmptyState onAdd={() => setIsAddDialogOpen(true)} />
        </Card>
      )}

      {/* Budget Tips */}
      <Card className="data-card p-6 bg-accent/5 border-accent/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            💡
          </div>
          <div>
            <h3 className="font-semibold mb-2">Budget Management Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Set realistic budgets based on your past 3-month average spending</li>
              <li>• Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
              <li>• Review and adjust budgets monthly to reflect lifestyle changes</li>
              <li>• Set alert thresholds to catch overspending early</li>
              <li>• Track discretionary spending categories closely (dining, entertainment)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBudgetId} onOpenChange={() => setDeleteBudgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this budget and stop tracking spending for this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBudgetId && deleteMutation.mutate(deleteBudgetId)}
            >
              {deleteMutation.isPending ? (
                <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
