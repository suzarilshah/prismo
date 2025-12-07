"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Plus, Loader2, AlertTriangle, CheckCircle2,
  Clock, CreditCard, MoreVertical, Pencil, Trash2,
  XCircle, ArrowUpCircle, LayoutGrid, LayoutList, Archive, ChevronDown,
  ChevronUp, ExternalLink, Wallet, TrendingUp, Calendar, Music, Video,
  Cloud, Gamepad2, BookOpen, Dumbbell, ShoppingBag, Heart, Sparkles, Globe
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { toast } from "sonner";
import { NoSubscriptionsEmptyState } from "@/components/ui/empty-states";
import { motion } from "framer-motion";
import { PaymentMethodSelect } from "@/components/ui/payment-method-select";

// Types
interface Subscription {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: string;
  nextBillingDate: string;
  startDate: string;
  isActive: boolean;
  website?: string;
  icon?: string;
  planTier?: string;
  notes?: string;
  reminderDays: number;
  category?: { id: string; name: string; color: string };
  currentPayment?: { id: string; isPaid: boolean; paidAt?: string };
  daysUntilBilling: number;
  isDueSoon: boolean;
  isOverdue: boolean;
}

interface SubscriptionSummary {
  total: number;
  active: number;
  monthlyTotal: number;
  yearlyTotal: number;
  overdue: number;
  dueSoon: number;
}

// Subscription category icons
const SUBSCRIPTION_ICONS = [
  { value: "🎵", label: "Music", icon: Music },
  { value: "🎬", label: "Streaming", icon: Video },
  { value: "☁️", label: "Cloud Storage", icon: Cloud },
  { value: "🎮", label: "Gaming", icon: Gamepad2 },
  { value: "📚", label: "Education", icon: BookOpen },
  { value: "💪", label: "Fitness", icon: Dumbbell },
  { value: "🛒", label: "Shopping", icon: ShoppingBag },
  { value: "💖", label: "Lifestyle", icon: Heart },
  { value: "✨", label: "Premium", icon: Sparkles },
  { value: "🌐", label: "Software", icon: Globe },
  { value: "📦", label: "Other", icon: CreditCard },
];

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PLAN_TIERS = [
  { value: "free", label: "Free" },
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];

// Calculate total paid for a subscription
function calculateTotalPaid(subscription: Subscription): { totalPaid: number; paymentsMade: number; totalExpected: number } {
  const startDate = new Date(subscription.startDate);
  const now = new Date();
  const monthsActive = Math.max(0,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth()) + 1
  );
  
  const amount = parseFloat(subscription.amount);
  let totalExpected = 0;
  
  switch (subscription.frequency) {
    case "monthly":
      totalExpected = monthsActive;
      break;
    case "yearly":
      totalExpected = Math.ceil(monthsActive / 12);
      break;
    case "weekly":
      totalExpected = monthsActive * 4;
      break;
    default:
      totalExpected = monthsActive;
  }
  
  // Assume all past payments were made except current if not paid
  const paymentsMade = subscription.currentPayment?.isPaid ? totalExpected : Math.max(0, totalExpected - 1);
  const totalPaid = paymentsMade * amount;
  
  return { totalPaid, paymentsMade, totalExpected };
}

// API Functions
async function fetchSubscriptions(month?: string) {
  const url = month ? `/api/subscriptions?month=${month}` : "/api/subscriptions";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function createSubscription(data: any) {
  const res = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateSubscription(id: string, data: any) {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function deleteSubscription(id: string) {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

async function updatePaymentStatus(subscriptionId: string, year: number, month: number, isPaid: boolean) {
  const res = await fetch(`/api/subscriptions/${subscriptionId}/payments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month, isPaid, createTransaction: isPaid }),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function terminateSubscriptionApi(id: string, data: { reason: string; effectiveDate: string }) {
  const res = await fetch(`/api/subscriptions/${id}/terminate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to terminate");
  return res.json();
}

async function modifySubscriptionAmount(id: string, data: { newAmount: string; newPlanTier?: string; effectiveDate: string; reason: string }) {
  const res = await fetch(`/api/subscriptions/${id}/modify-amount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to modify");
  return res.json();
}

export default function SubscriptionsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // View mode (list or grid)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // Terminate dialog state
  const [terminateSubscription, setTerminateSubscription] = useState<Subscription | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateEffectiveDate, setTerminateEffectiveDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toISOString().split("T")[0];
  });
  
  // Modify amount dialog state
  const [modifySubscription, setModifySubscription] = useState<Subscription | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newPlanTier, setNewPlanTier] = useState("");
  const [modifyEffectiveDate, setModifyEffectiveDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toISOString().split("T")[0];
  });
  const [modifyReason, setModifyReason] = useState("");
  
  // Show/hide paid section
  const [showPaidSection, setShowPaidSection] = useState(false);
  
  // Current month for payment tracking
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    frequency: "monthly",
    nextBillingDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    icon: "📦",
    planTier: "",
    website: "",
    notes: "",
    reminderDays: 3,
    isActive: true,
    paymentMethod: "",
    creditCardId: null as string | null,
  });

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["subscriptions", currentMonth],
    queryFn: () => fetchSubscriptions(currentMonth),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Subscription Added", {
        description: `"${variables.name}" has been added to your subscriptions.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add subscription", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSubscription(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setEditingSubscription(null);
      resetForm();
      toast.success("Subscription Updated", {
        description: `"${variables.data.name}" has been updated.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update subscription", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setDeleteId(null);
      toast.success("Subscription Deleted", {
        description: "The subscription has been permanently removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete subscription", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, year, month, isPaid }: { id: string; year: number; month: number; isPaid: boolean }) =>
      updatePaymentStatus(id, year, month, isPaid),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success(
        variables.isPaid ? "Payment Recorded" : "Payment Unmarked",
        { description: variables.isPaid ? "This month's payment has been marked as paid." : "Payment status has been reset." }
      );
    },
    onError: (error) => {
      toast.error("Failed to update payment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string; effectiveDate: string } }) =>
      terminateSubscriptionApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      const name = terminateSubscription?.name || "Subscription";
      setTerminateSubscription(null);
      setTerminateReason("");
      toast.success("Subscription Cancelled", {
        description: `"${name}" has been cancelled and archived.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to cancel subscription", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const modifyAmountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newAmount: string; newPlanTier?: string; effectiveDate: string; reason: string } }) =>
      modifySubscriptionAmount(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      const name = modifySubscription?.name || "Subscription";
      setModifySubscription(null);
      setNewAmount("");
      setNewPlanTier("");
      setModifyReason("");
      toast.success("Plan Changed", {
        description: `"${name}" amount updated to RM ${variables.data.newAmount}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update plan", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      frequency: "monthly",
      nextBillingDate: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      icon: "📦",
      planTier: "",
      website: "",
      notes: "",
      reminderDays: 3,
      isActive: true,
      paymentMethod: "",
      creditCardId: null,
    });
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      name: subscription.name,
      amount: subscription.amount,
      frequency: subscription.frequency,
      nextBillingDate: subscription.nextBillingDate.split("T")[0],
      startDate: subscription.startDate.split("T")[0],
      icon: subscription.icon || "📦",
      planTier: subscription.planTier || "",
      website: subscription.website || "",
      notes: subscription.notes || "",
      reminderDays: subscription.reminderDays,
      isActive: subscription.isActive,
      paymentMethod: (subscription as any).paymentMethod || "",
      creditCardId: (subscription as any).creditCardId || null,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      currency: "MYR",
    };

    if (editingSubscription) {
      updateMutation.mutate({ id: editingSubscription.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handlePaymentToggle = (subscription: Subscription, isPaid: boolean) => {
    paymentMutation.mutate({
      id: subscription.id,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isPaid,
    });
  };

  const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);

  const getIconInfo = (iconValue: string) =>
    SUBSCRIPTION_ICONS.find((i) => i.value === iconValue) || SUBSCRIPTION_ICONS[SUBSCRIPTION_ICONS.length - 1];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading subscriptions..." />
      </div>
    );
  }

  const subscriptions: Subscription[] = subscriptionData?.data || [];
  const summary: SubscriptionSummary = subscriptionData?.summary || {
    total: 0,
    active: 0,
    monthlyTotal: 0,
    yearlyTotal: 0,
    overdue: 0,
    dueSoon: 0,
  };

  // Calculate total paid across all subscriptions
  const totalPaidAllTime = subscriptions.reduce((sum, s) => {
    const { totalPaid } = calculateTotalPaid(s);
    return sum + totalPaid;
  }, 0);

  // Group subscriptions - Paid subscriptions should NOT appear in overdue or due soon
  const overdueSubscriptions = subscriptions.filter((s) => s.isOverdue && !s.currentPayment?.isPaid);
  const dueSoonSubscriptions = subscriptions.filter((s) => s.isDueSoon && !s.isOverdue && !s.currentPayment?.isPaid);
  const paidThisMonth = subscriptions.filter((s) => s.currentPayment?.isPaid);
  const upcomingSubscriptions = subscriptions.filter(
    (s) => !s.isOverdue && !s.isDueSoon && !s.currentPayment?.isPaid
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your recurring subscriptions and payments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Archive Link */}
          <Link href="/dashboard/subscriptions/archive">
            <Button variant="outline" size="sm" className="gap-2">
              <Archive className="w-4 h-4" /> Archive
            </Button>
          </Link>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingSubscription(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingSubscription ? "Edit Subscription" : "Add New Subscription"}
                </DialogTitle>
                <DialogDescription>
                  Add a recurring subscription to track your payments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Netflix, Spotify, Adobe CC"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {SUBSCRIPTION_ICONS.map((icon) => (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: icon.value })}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                          formData.icon === icon.value
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {icon.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount and Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (RM) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency *</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plan Tier */}
                <div className="space-y-2">
                  <Label>Plan Tier (Optional)</Label>
                  <Select
                    value={formData.planTier}
                    onValueChange={(v) => setFormData({ ...formData, planTier: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TIERS.map((tier) => (
                        <SelectItem key={tier.value} value={tier.value}>
                          {tier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Billing Date *</Label>
                    <Input
                      type="date"
                      value={formData.nextBillingDate}
                      onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label>Website (Optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                {/* Reminder */}
                <div className="space-y-2">
                  <Label>Reminder Days Before</Label>
                  <Select
                    value={formData.reminderDays.toString()}
                    onValueChange={(v) => setFormData({ ...formData, reminderDays: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 3, 5, 7, 14].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} day{d !== 1 ? "s" : ""} before
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <PaymentMethodSelect
                    value={formData.paymentMethod}
                    creditCardId={formData.creditCardId}
                    onValueChange={(method, cardId) => 
                      setFormData({ 
                        ...formData, 
                        paymentMethod: method, 
                        creditCardId: cardId ?? null
                      })
                    }
                    placeholder="Select payment method (optional)"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.amount}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingSubscription ? "Update Subscription" : "Add Subscription"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="data-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Monthly Total</div>
          </div>
          <div className="font-display font-bold text-2xl">{formatCurrency(summary.monthlyTotal)}</div>
        </Card>
        
        <Card className="data-card p-6 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">All Time Paid</div>
          </div>
          <div className="font-display font-bold text-2xl text-emerald-500">{formatCurrency(totalPaidAllTime)}</div>
        </Card>
        
        <Card className="data-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Active</div>
          </div>
          <div className="font-display font-bold text-2xl">{summary.active}</div>
        </Card>
        
        {summary.overdue > 0 && (
          <Card className="data-card p-6 border-red-500/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase">Overdue</div>
            </div>
            <div className="font-display font-bold text-2xl text-red-500">{summary.overdue}</div>
          </Card>
        )}
        
        {summary.dueSoon > 0 && (
          <Card className="data-card p-6 border-amber-500/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase">Due Soon</div>
            </div>
            <div className="font-display font-bold text-2xl text-amber-500">{summary.dueSoon}</div>
          </Card>
        )}
      </div>

      {/* Monthly Checklist */}
      <Card className="data-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })} Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overdue Section */}
          {overdueSubscriptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Overdue
              </h3>
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                {overdueSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onTogglePaid={(isPaid) => handlePaymentToggle(subscription, isPaid)}
                    onEdit={() => handleEdit(subscription)}
                    onDelete={() => setDeleteId(subscription.id)}
                    onTerminate={() => setTerminateSubscription(subscription)}
                    onModifyAmount={() => {
                      setModifySubscription(subscription);
                      setNewAmount(subscription.amount);
                      setNewPlanTier(subscription.planTier || "");
                    }}
                    formatCurrency={formatCurrency}
                    getIconInfo={getIconInfo}
                    isPending={paymentMutation.isPending}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Due Soon Section */}
          {dueSoonSubscriptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Due Soon (Next 7 Days)
              </h3>
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                {dueSoonSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onTogglePaid={(isPaid) => handlePaymentToggle(subscription, isPaid)}
                    onEdit={() => handleEdit(subscription)}
                    onDelete={() => setDeleteId(subscription.id)}
                    onTerminate={() => setTerminateSubscription(subscription)}
                    onModifyAmount={() => {
                      setModifySubscription(subscription);
                      setNewAmount(subscription.amount);
                      setNewPlanTier(subscription.planTier || "");
                    }}
                    formatCurrency={formatCurrency}
                    getIconInfo={getIconInfo}
                    isPending={paymentMutation.isPending}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingSubscriptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming
              </h3>
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                {upcomingSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onTogglePaid={(isPaid) => handlePaymentToggle(subscription, isPaid)}
                    onEdit={() => handleEdit(subscription)}
                    onDelete={() => setDeleteId(subscription.id)}
                    onTerminate={() => setTerminateSubscription(subscription)}
                    onModifyAmount={() => {
                      setModifySubscription(subscription);
                      setNewAmount(subscription.amount);
                      setNewPlanTier(subscription.planTier || "");
                    }}
                    formatCurrency={formatCurrency}
                    getIconInfo={getIconInfo}
                    isPending={paymentMutation.isPending}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paid Section - Collapsible */}
          {paidThisMonth.length > 0 && (
            <div className="space-y-2">
              <button 
                onClick={() => setShowPaidSection(!showPaidSection)}
                className="text-sm font-semibold text-emerald-500 flex items-center gap-2 hover:text-emerald-400 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> 
                Paid This Month ({paidThisMonth.length})
                {showPaidSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPaidSection && (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                  {paidThisMonth.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      onTogglePaid={(isPaid) => handlePaymentToggle(subscription, isPaid)}
                      onEdit={() => handleEdit(subscription)}
                      onDelete={() => setDeleteId(subscription.id)}
                      onTerminate={() => setTerminateSubscription(subscription)}
                      onModifyAmount={() => {
                        setModifySubscription(subscription);
                        setNewAmount(subscription.amount);
                        setNewPlanTier(subscription.planTier || "");
                      }}
                      formatCurrency={formatCurrency}
                      getIconInfo={getIconInfo}
                      isPending={paymentMutation.isPending}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {subscriptions.length === 0 && (
            <NoSubscriptionsEmptyState onAdd={() => setIsAddDialogOpen(true)} />
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the subscription and all its payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? <LoadingSpinner size="xs" variant="minimal" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Dialog */}
      <Dialog open={!!terminateSubscription} onOpenChange={(open) => !open && setTerminateSubscription(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              This will archive &ldquo;{terminateSubscription?.name}&rdquo; and remove it from your monthly checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cancellation Date</Label>
              <Input
                type="date"
                value={terminateEffectiveDate}
                onChange={(e) => setTerminateEffectiveDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The subscription will be archived starting from this date
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., No longer needed, Found better alternative, etc."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTerminateSubscription(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (terminateSubscription) {
                  terminateMutation.mutate({
                    id: terminateSubscription.id,
                    data: {
                      reason: terminateReason,
                      effectiveDate: terminateEffectiveDate,
                    },
                  });
                }
              }}
              disabled={terminateMutation.isPending}
            >
              {terminateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Cancel Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modify Amount Dialog */}
      <Dialog open={!!modifySubscription} onOpenChange={(open) => !open && setModifySubscription(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Change Plan
            </DialogTitle>
            <DialogDescription>
              Upgrade or downgrade &ldquo;{modifySubscription?.name}&rdquo; 
              (Current: {modifySubscription && formatCurrency(modifySubscription.amount)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Plan Tier</Label>
              <Select
                value={newPlanTier}
                onValueChange={(v) => setNewPlanTier(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Amount (RM)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter new amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              {modifySubscription && newAmount && parseFloat(newAmount) !== parseFloat(modifySubscription.amount) && (
                <p className={`text-xs ${parseFloat(newAmount) > parseFloat(modifySubscription.amount) ? "text-amber-500" : "text-emerald-500"}`}>
                  {parseFloat(newAmount) > parseFloat(modifySubscription.amount) ? (
                    <>↑ Upgrade (+{formatCurrency(parseFloat(newAmount) - parseFloat(modifySubscription.amount))})</>
                  ) : (
                    <>↓ Downgrade (-{formatCurrency(parseFloat(modifySubscription.amount) - parseFloat(newAmount))})</>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={modifyEffectiveDate}
                onChange={(e) => setModifyEffectiveDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The new amount will apply from this date onwards
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Upgrading for more features, etc."
                value={modifyReason}
                onChange={(e) => setModifyReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModifySubscription(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (modifySubscription && newAmount) {
                  modifyAmountMutation.mutate({
                    id: modifySubscription.id,
                    data: {
                      newAmount,
                      newPlanTier: newPlanTier || undefined,
                      effectiveDate: modifyEffectiveDate,
                      reason: modifyReason,
                    },
                  });
                }
              }}
              disabled={modifyAmountMutation.isPending || !newAmount}
            >
              {modifyAmountMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Update Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subscription Card Component
function SubscriptionCard({
  subscription,
  onTogglePaid,
  onEdit,
  onDelete,
  onTerminate,
  onModifyAmount,
  formatCurrency,
  getIconInfo,
  isPending,
  viewMode = "list",
}: {
  subscription: Subscription;
  onTogglePaid: (isPaid: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTerminate: () => void;
  onModifyAmount: () => void;
  formatCurrency: (amount: string | number) => string;
  getIconInfo: (icon: string) => typeof SUBSCRIPTION_ICONS[0];
  isPending: boolean;
  viewMode?: "list" | "grid";
}) {
  const iconInfo = getIconInfo(subscription.icon || "📦");
  const isPaid = subscription.currentPayment?.isPaid;
  const { totalPaid, paymentsMade, totalExpected } = calculateTotalPaid(subscription);

  if (viewMode === "grid") {
    return (
      <div
        className={`p-4 rounded-lg border transition-colors ${
          isPaid
            ? "border-emerald-500/30 bg-emerald-500/5"
            : subscription.isOverdue
            ? "border-red-500/30 bg-red-500/5"
            : subscription.isDueSoon
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border hover:border-primary/30"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isPaid}
              onCheckedChange={(checked: boolean | "indeterminate") => onTogglePaid(!!checked)}
              disabled={isPending}
              className="w-5 h-5"
            />
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              isPaid ? "bg-emerald-500/10" : "bg-muted"
            }`}>
              {subscription.icon || "📦"}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onModifyAmount}>
                <ArrowUpCircle className="w-4 h-4 mr-2" /> Change Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTerminate} className="text-amber-500">
                <XCircle className="w-4 h-4 mr-2" /> Cancel
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className={isPaid ? "opacity-60" : ""}>
          <p className={`font-semibold ${isPaid ? "line-through" : ""}`}>{subscription.name}</p>
          {subscription.planTier && (
            <Badge variant="outline" className="text-xs mt-1">{subscription.planTier}</Badge>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display font-bold text-xl">{formatCurrency(subscription.amount)}</span>
            <span className="text-xs text-muted-foreground">/{subscription.frequency}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Due {new Date(subscription.nextBillingDate).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">All Time</span>
            <span className="font-semibold text-emerald-500">{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className={`p-4 rounded-lg border transition-colors group ${
        isPaid
          ? "border-emerald-500/30 bg-emerald-500/5"
          : subscription.isOverdue
          ? "border-red-500/30 bg-red-500/5"
          : subscription.isDueSoon
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isPaid}
            onCheckedChange={(checked: boolean | "indeterminate") => onTogglePaid(!!checked)}
            disabled={isPending}
            className="w-5 h-5"
          />
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
            isPaid ? "bg-emerald-500/10" : "bg-muted"
          }`}>
            {subscription.icon || "📦"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-medium ${isPaid ? "line-through text-muted-foreground" : ""}`}>
                {subscription.name}
              </p>
              {subscription.planTier && (
                <Badge variant="outline" className="text-xs">{subscription.planTier}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Due {new Date(subscription.nextBillingDate).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {subscription.daysUntilBilling < 0 ? (
                <span className="text-red-500">({Math.abs(subscription.daysUntilBilling)} days overdue)</span>
              ) : subscription.daysUntilBilling === 0 ? (
                <span className="text-amber-500">(Due today)</span>
              ) : subscription.daysUntilBilling <= 7 ? (
                <span className="text-amber-500">({subscription.daysUntilBilling} days left)</span>
              ) : null}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-display font-semibold text-lg ${isPaid ? "text-muted-foreground" : ""}`}>
              {formatCurrency(subscription.amount)}
            </p>
            <p className="text-xs text-muted-foreground">/ {subscription.frequency}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onModifyAmount}>
                <ArrowUpCircle className="w-4 h-4 mr-2" /> Change Plan
              </DropdownMenuItem>
              {subscription.website && (
                <DropdownMenuItem asChild>
                  <a href={subscription.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Visit Website
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onTerminate} className="text-amber-500">
                <XCircle className="w-4 h-4 mr-2" /> Cancel
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Total Paid Section */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Total Paid ({paymentsMade} of {totalExpected} payments)
          </span>
          <span className="font-semibold text-emerald-500">{formatCurrency(totalPaid)}</span>
        </div>
      </div>
    </div>
  );
}
