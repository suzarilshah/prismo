"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Target, Plus, Calendar, TrendingUp, MoreVertical, Pencil, Trash2, DollarSign } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { NoGoalsEmptyState } from "@/components/ui/empty-states";
import { GoalProgress } from "@/components/ui/animated-progress";
import { motion } from "framer-motion";

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: string;
  currentAmount: string;
  currency: string;
  deadline?: string;
  category?: string;
  icon?: string;
  color?: string;
  isCompleted: boolean;
  progress?: number;
}

const GOAL_ICONS = [
  { value: "🎯", label: "Target" },
  { value: "🏠", label: "House" },
  { value: "🚗", label: "Car" },
  { value: "✈️", label: "Travel" },
  { value: "💍", label: "Wedding" },
  { value: "👶", label: "Baby" },
  { value: "🎓", label: "Education" },
  { value: "💼", label: "Business" },
  { value: "🏥", label: "Health" },
  { value: "🎁", label: "Gift" },
  { value: "💰", label: "Savings" },
  { value: "📱", label: "Tech" },
];

const GOAL_CATEGORIES = [
  "Savings", "Emergency Fund", "Vacation", "House", "Car", "Education", 
  "Wedding", "Retirement", "Investment", "Debt Payoff", "Other"
];

async function fetchGoals() {
  const res = await fetch("/api/goals");
  if (!res.ok) throw new Error("Failed to fetch goals");
  return (await res.json()).data || [];
}

async function createGoal(data: Partial<Goal>) {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  return res.json();
}

async function updateGoal(id: string, data: Partial<Goal>) {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update goal");
  return res.json();
}

async function deleteGoal(id: string) {
  const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete goal");
  return res.json();
}

export default function GoalsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    category: "",
    icon: "🎯",
    color: "#8B5CF6",
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: fetchGoals,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      resetForm();
      setIsDialogOpen(false);
      toast.success("Goal Created", {
        description: `"${variables.name}" has been added to your goals.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to create goal", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) => updateGoal(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const wasAddingFunds = isAddFundsOpen;
      const goalName = selectedGoal?.name || editingGoal?.name || variables.data.name || "Goal";
      resetForm();
      setIsDialogOpen(false);
      setEditingGoal(null);
      setIsAddFundsOpen(false);
      setSelectedGoal(null);
      setFundsAmount("");
      toast.success(wasAddingFunds ? "Funds Added" : "Goal Updated", {
        description: wasAddingFunds 
          ? `Added funds to "${goalName}".`
          : `"${goalName}" has been updated.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update goal", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setDeleteGoalId(null);
      toast.success("Goal Deleted", {
        description: "The goal has been permanently removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete goal", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      targetAmount: "",
      currentAmount: "0",
      deadline: "",
      category: "",
      icon: "🎯",
      color: "#8B5CF6",
    });
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || "",
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || "0",
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "",
      category: goal.category || "",
      icon: goal.icon || "🎯",
      color: goal.color || "#8B5CF6",
    });
    setIsDialogOpen(true);
  };

  const handleAddFunds = (goal: Goal) => {
    setSelectedGoal(goal);
    setFundsAmount("");
    setIsAddFundsOpen(true);
  };

  const submitAddFunds = () => {
    if (!selectedGoal || !fundsAmount) return;
    const newAmount = parseFloat(selectedGoal.currentAmount || "0") + parseFloat(fundsAmount);
    const isCompleted = newAmount >= parseFloat(selectedGoal.targetAmount);
    updateMutation.mutate({ id: selectedGoal.id, data: { currentAmount: newAmount.toString(), isCompleted } });
  };

  const handleSubmit = () => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingGoal(null);
      resetForm();
    }
    setIsDialogOpen(open);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading goals..." />
      </div>
    );
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const activeGoals = goals?.filter((g: Goal) => !g.isCompleted) || [];
  const completedGoals = goals?.filter((g: Goal) => g.isCompleted) || [];

  const totalTargetAmount = activeGoals.reduce(
    (sum: number, goal: Goal) => sum + parseFloat(goal.targetAmount),
    0
  );

  const totalCurrentAmount = activeGoals.reduce(
    (sum: number, goal: Goal) => sum + parseFloat(goal.currentAmount || "0"),
    0
  );

  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your progress towards your dreams</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger><SelectValue><span className="text-xl">{formData.icon}</span></SelectValue></SelectTrigger>
                    <SelectContent>
                      {GOAL_ICONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <span className="flex items-center gap-2"><span className="text-xl">{icon.value}</span>{icon.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="name">Goal Name *</Label>
                  <Input id="name" placeholder="e.g., Emergency Fund" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Why is this goal important?" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount (MYR) *</Label>
                  <Input id="targetAmount" type="number" placeholder="0.00" value={formData.targetAmount} onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentAmount">Current Amount</Label>
                  <Input id="currentAmount" type="number" placeholder="0.00" value={formData.currentAmount} onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Target Date</Label>
                  <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.targetAmount}>
                {createMutation.isPending || updateMutation.isPending ? <LoadingSpinner size="xs" variant="minimal" className="mr-2" /> : null}
                {editingGoal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Progress Card */}
      <Card className="data-card p-4 md:p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Overall Progress
              </h3>
              <p className="text-2xl md:text-3xl font-display font-bold mt-2">{overallProgress.toFixed(1)}%</p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-xl md:text-2xl font-display font-semibold text-primary mt-1">
                {formatCurrency(totalCurrentAmount.toString())}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                of {formatCurrency(totalTargetAmount.toString())}
              </p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </Card>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-xl">Active Goals ({activeGoals.length})</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeGoals.map((goal: Goal & { progress: number }) => {
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card key={goal.id} className="data-card p-6 hover:shadow-lg transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: goal.color ? `${goal.color}20` : "hsl(var(--primary) / 0.1)" }}
                        >
                          <span className="text-2xl">{goal.icon || "🎯"}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{goal.name}</h3>
                          {goal.category && (
                            <p className="text-xs text-muted-foreground">{goal.category}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(goal)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteGoalId(goal.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{goal.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{formatCurrency(goal.currentAmount)}</span>
                        <span className="text-muted-foreground">of {formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      {daysLeft !== null && daysLeft >= 0 ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{daysLeft} days left</span>
                        </div>
                      ) : daysLeft !== null ? (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <Calendar className="w-3 h-3" />
                          <span>Overdue</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>No deadline</span>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleAddFunds(goal)}>
                        <DollarSign className="w-3 h-3 mr-1" /> Add Funds
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-xl">Completed Goals ({completedGoals.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedGoals.map((goal: Goal) => (
              <Card key={goal.id} className="data-card p-6 opacity-75">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-500 font-semibold">
                    {formatCurrency(goal.targetAmount)} achieved!
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <Card className="data-card">
          <NoGoalsEmptyState onAdd={() => setIsDialogOpen(true)} />
        </Card>
      )}

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add Funds to Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedGoal && (
              <>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Adding to</p>
                  <p className="font-semibold text-lg">{selectedGoal.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current: {formatCurrency(selectedGoal.currentAmount)} / {formatCurrency(selectedGoal.targetAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundsAmount">Amount to Add (MYR)</Label>
                  <Input id="fundsAmount" type="number" placeholder="0.00" value={fundsAmount} onChange={(e) => setFundsAmount(e.target.value)} />
                </div>
                <Button className="w-full" onClick={submitAddFunds} disabled={updateMutation.isPending || !fundsAmount}>
                  {updateMutation.isPending ? <LoadingSpinner size="xs" variant="minimal" className="mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Add Funds
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this goal and its progress.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteGoalId && deleteMutation.mutate(deleteGoalId)}>
              {deleteMutation.isPending ? <LoadingSpinner size="xs" variant="minimal" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
