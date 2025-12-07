"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Plus, Calendar, DollarSign, AlertTriangle, CheckCircle2, 
  Clock, CreditCard, Home, Car, GraduationCap, Shield, Zap, Receipt,
  Bell, BellOff, Trash2, Pencil, ChevronRight, TrendingUp, Wallet,
  CalendarDays, MoreVertical, ExternalLink, Building, Landmark, Loader2,
  LayoutGrid, LayoutList, Archive, ArrowUpCircle, ArrowDownCircle, 
  XCircle, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface Commitment {
  id: string;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  commitmentType: string;
  frequency: string;
  dueDay?: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  totalAmount?: string;
  remainingAmount?: string;
  interestRate?: string;
  payee?: string;
  accountNumber?: string;
  autoPayEnabled: boolean;
  isActive: boolean;
  isPriority: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  isTaxDeductible: boolean;
  taxCategory?: string;
  icon?: string;
  color?: string;
  notes?: string;
  // Computed fields
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  currentPayment?: {
    id: string;
    isPaid: boolean;
    status: string;
    paidAt?: string;
  };
  category?: { name: string; color: string };
}

interface CommitmentSummary {
  total: number;
  active: number;
  totalMonthly: number;
  overdue: number;
  dueSoon: number;
}

// Calculate total paid for a commitment from start date until now
function calculateTotalPaid(commitment: Commitment): { totalPaid: number; paymentsMade: number; totalExpected: number } {
  const startDate = new Date(commitment.startDate);
  const now = new Date();
  const amount = parseFloat(commitment.amount) || 0;
  
  // Calculate months between start and now
  let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                   (now.getMonth() - startDate.getMonth());
  
  // Include current month if we're past the start date
  if (now >= startDate) {
    monthsDiff = Math.max(1, monthsDiff + 1);
  }
  
  let paymentsMade = 0;
  let totalExpected = 0;
  
  switch (commitment.frequency) {
    case "monthly":
      totalExpected = monthsDiff;
      // Estimate payments made based on current payment status
      paymentsMade = commitment.currentPayment?.isPaid ? monthsDiff : Math.max(0, monthsDiff - 1);
      break;
    case "quarterly":
      totalExpected = Math.floor(monthsDiff / 3);
      paymentsMade = commitment.currentPayment?.isPaid ? totalExpected : Math.max(0, totalExpected - 1);
      break;
    case "yearly":
      totalExpected = Math.floor(monthsDiff / 12);
      paymentsMade = commitment.currentPayment?.isPaid ? totalExpected : Math.max(0, totalExpected - 1);
      break;
    case "one_time":
      totalExpected = 1;
      paymentsMade = commitment.currentPayment?.isPaid ? 1 : 0;
      break;
    default:
      totalExpected = monthsDiff;
      paymentsMade = Math.max(0, monthsDiff - 1);
  }
  
  return {
    totalPaid: paymentsMade * amount,
    paymentsMade,
    totalExpected
  };
}

// Commitment type icons and colors
const COMMITMENT_TYPES = [
  { value: "mortgage", label: "Mortgage / Housing Loan", icon: Home, color: "text-blue-500" },
  { value: "car_loan", label: "Car Loan", icon: Car, color: "text-amber-500" },
  { value: "education_loan", label: "Education Loan (PTPTN)", icon: GraduationCap, color: "text-purple-500" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, color: "text-red-500" },
  { value: "insurance", label: "Insurance Premium", icon: Shield, color: "text-emerald-500" },
  { value: "bill", label: "Utility Bill", icon: Zap, color: "text-yellow-500" },
  { value: "rent", label: "Rent", icon: Building, color: "text-cyan-500" },
  { value: "subscription", label: "Subscription", icon: Receipt, color: "text-pink-500" },
  { value: "loan", label: "Personal Loan", icon: Landmark, color: "text-indigo-500" },
  { value: "other", label: "Other", icon: Wallet, color: "text-gray-500" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One Time" },
];

// API Functions
async function fetchCommitments(month?: string) {
  const params = new URLSearchParams();
  params.append("active", "true");
  params.append("includePayments", "true");
  if (month) params.append("month", month);
  
  const res = await fetch(`/api/commitments?${params}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function createCommitment(data: any) {
  const res = await fetch("/api/commitments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateCommitment(id: string, data: any) {
  const res = await fetch(`/api/commitments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function deleteCommitment(id: string) {
  const res = await fetch(`/api/commitments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

async function updatePaymentStatus(commitmentId: string, year: number, month: number, isPaid: boolean) {
  const res = await fetch(`/api/commitments/${commitmentId}/payments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month, isPaid, createTransaction: isPaid }),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function terminateCommitmentApi(id: string, data: { reason: string; effectiveDate: string }) {
  const res = await fetch(`/api/commitments/${id}/terminate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to terminate");
  return res.json();
}

async function modifyCommitmentAmount(id: string, data: { newAmount: string; effectiveDate: string; reason: string }) {
  const res = await fetch(`/api/commitments/${id}/modify-amount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to modify amount");
  return res.json();
}

export default function CommitmentsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // View mode (list or grid)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // Terminate dialog state
  const [terminateCommitment, setTerminateCommitment] = useState<Commitment | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateEffectiveDate, setTerminateEffectiveDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toISOString().split("T")[0];
  });
  
  // Modify amount dialog state
  const [modifyCommitment, setModifyCommitment] = useState<Commitment | null>(null);
  const [newAmount, setNewAmount] = useState("");
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
    description: "",
    amount: "",
    commitmentType: "bill",
    frequency: "monthly",
    dueDay: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    payee: "",
    accountNumber: "",
    totalAmount: "",
    interestRate: "",
    autoPayEnabled: false,
    isPriority: false,
    reminderEnabled: true,
    reminderDaysBefore: 3,
    isTaxDeductible: false,
    taxCategory: "",
    notes: "",
  });

  const { data: commitmentData, isLoading } = useQuery({
    queryKey: ["commitments", currentMonth],
    queryFn: () => fetchCommitments(currentMonth),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createCommitment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Commitment Added", {
        description: `"${variables.name}" has been added to your commitments.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add commitment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCommitment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      setEditingCommitment(null);
      resetForm();
      toast.success("Commitment Updated", {
        description: "Your commitment has been updated.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update commitment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommitment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      setDeleteId(null);
      toast.success("Commitment Deleted", {
        description: "The commitment has been removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete commitment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, year, month, isPaid }: { id: string; year: number; month: number; isPaid: boolean }) =>
      updatePaymentStatus(id, year, month, isPaid),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      toast.success(variables.isPaid ? "Payment Recorded" : "Payment Unmarked", {
        description: variables.isPaid ? "Payment has been marked as paid." : "Payment has been unmarked.",
      });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string; effectiveDate: string } }) =>
      terminateCommitmentApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      setTerminateCommitment(null);
      setTerminateReason("");
      toast.success("Commitment Terminated", {
        description: "The commitment has been terminated and archived.",
      });
    },
    onError: (error) => {
      toast.error("Failed to terminate commitment", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const modifyAmountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newAmount: string; effectiveDate: string; reason: string } }) =>
      modifyCommitmentAmount(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      setModifyCommitment(null);
      setNewAmount("");
      setModifyReason("");
      toast.success("Amount Modified", {
        description: `Amount updated to RM ${parseFloat(variables.data.newAmount).toLocaleString()}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to modify amount", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
      commitmentType: "bill",
      frequency: "monthly",
      dueDay: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      payee: "",
      accountNumber: "",
      totalAmount: "",
      interestRate: "",
      autoPayEnabled: false,
      isPriority: false,
      reminderEnabled: true,
      reminderDaysBefore: 3,
      isTaxDeductible: false,
      taxCategory: "",
      notes: "",
    });
  };

  const handleEdit = (commitment: Commitment) => {
    setEditingCommitment(commitment);
    setFormData({
      name: commitment.name,
      description: commitment.description || "",
      amount: commitment.amount,
      commitmentType: commitment.commitmentType,
      frequency: commitment.frequency,
      dueDay: commitment.dueDay || 1,
      startDate: commitment.startDate.split("T")[0],
      endDate: commitment.endDate?.split("T")[0] || "",
      payee: commitment.payee || "",
      accountNumber: commitment.accountNumber || "",
      totalAmount: commitment.totalAmount || "",
      interestRate: commitment.interestRate || "",
      autoPayEnabled: commitment.autoPayEnabled,
      isPriority: commitment.isPriority,
      reminderEnabled: commitment.reminderEnabled,
      reminderDaysBefore: commitment.reminderDaysBefore,
      isTaxDeductible: commitment.isTaxDeductible,
      taxCategory: commitment.taxCategory || "",
      notes: commitment.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    const nextDueDate = new Date(formData.startDate);
    nextDueDate.setDate(formData.dueDay);
    
    const submitData = {
      ...formData,
      nextDueDate: nextDueDate.toISOString(),
      currency: "MYR",
    };

    if (editingCommitment) {
      updateMutation.mutate({ id: editingCommitment.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handlePaymentToggle = (commitment: Commitment, isPaid: boolean) => {
    paymentMutation.mutate({
      id: commitment.id,
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

  const getTypeInfo = (type: string) =>
    COMMITMENT_TYPES.find((t) => t.value === type) || COMMITMENT_TYPES[COMMITMENT_TYPES.length - 1];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading commitments..." />
      </div>
    );
  }

  const commitments: Commitment[] = commitmentData?.data || [];
  const summary: CommitmentSummary = commitmentData?.summary || {
    total: 0,
    active: 0,
    totalMonthly: 0,
    overdue: 0,
    dueSoon: 0,
  };

  // Calculate total paid across all commitments
  const totalPaidAllTime = commitments.reduce((sum, c) => {
    const { totalPaid } = calculateTotalPaid(c);
    return sum + totalPaid;
  }, 0);

  // Group commitments - IMPORTANT: Paid commitments should NOT appear in overdue or due soon
  const overdueCommitments = commitments.filter((c) => c.isOverdue && !c.currentPayment?.isPaid);
  const dueSoonCommitments = commitments.filter((c) => c.isDueSoon && !c.isOverdue && !c.currentPayment?.isPaid);
  const paidThisMonth = commitments.filter((c) => c.currentPayment?.isPaid);
  const unpaidCommitments = commitments.filter(
    (c) => !c.isOverdue && !c.isDueSoon && !c.currentPayment?.isPaid
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight">Commitments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your bills, loans, and recurring payments
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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
          <Link href="/dashboard/commitments/archive">
            <Button variant="outline" size="sm" className="gap-2">
              <Archive className="w-4 h-4" /> Archive
            </Button>
          </Link>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingCommitment(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Commitment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingCommitment ? "Edit Commitment" : "Add New Commitment"}
              </DialogTitle>
              <DialogDescription>
                Add a recurring bill, loan payment, or subscription
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., TNB Electricity Bill"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.commitmentType}
                  onValueChange={(v: string) => setFormData({ ...formData, commitmentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMITMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (MYR) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v: string) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Day and Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Day (1-31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Payee */}
              <div className="space-y-2">
                <Label>Payee / Company</Label>
                <Input
                  placeholder="e.g., Tenaga Nasional Berhad"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                />
              </div>

              {/* Loan-specific fields */}
              {["loan", "mortgage", "car_loan", "education_loan", "credit_card"].includes(formData.commitmentType) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Loan Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Priority</Label>
                    <p className="text-xs text-muted-foreground">Mark as high priority</p>
                  </div>
                  <Switch
                    checked={formData.isPriority}
                    onCheckedChange={(v: boolean) => setFormData({ ...formData, isPriority: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reminder</Label>
                    <p className="text-xs text-muted-foreground">Get notified before due date</p>
                  </div>
                  <Switch
                    checked={formData.reminderEnabled}
                    onCheckedChange={(v: boolean) => setFormData({ ...formData, reminderEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tax Deductible</Label>
                    <p className="text-xs text-muted-foreground">Can be claimed for tax relief</p>
                  </div>
                  <Switch
                    checked={formData.isTaxDeductible}
                    onCheckedChange={(v: boolean) => setFormData({ ...formData, isTaxDeductible: v })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
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
                {editingCommitment ? "Update Commitment" : "Add Commitment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="data-card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Monthly Total</div>
          </div>
          <div className="font-display font-bold text-2xl">{formatCurrency(summary.totalMonthly)}</div>
        </Card>
        
        <Card className="data-card p-4 md:p-6 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Total Paid</div>
          </div>
          <div className="font-display font-bold text-2xl text-emerald-500">{formatCurrency(totalPaidAllTime)}</div>
          <p className="text-xs text-muted-foreground mt-1">Since start of commitments</p>
        </Card>
        
        <Card className="data-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Active</div>
          </div>
          <div className="font-display font-bold text-2xl">{summary.active}</div>
        </Card>
        
        <Card className={`data-card p-4 md:p-6 ${summary.overdue > 0 ? "border-red-500/30" : ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              summary.overdue > 0 ? "bg-red-500/10" : "bg-muted"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${summary.overdue > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Overdue</div>
          </div>
          <div className={`font-display font-bold text-2xl ${summary.overdue > 0 ? "text-red-500" : ""}`}>
            {summary.overdue}
          </div>
        </Card>
        
        <Card className={`data-card p-4 md:p-6 ${summary.dueSoon > 0 ? "border-amber-500/30" : ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              summary.dueSoon > 0 ? "bg-amber-500/10" : "bg-muted"
            }`}>
              <Clock className={`w-5 h-5 ${summary.dueSoon > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">Due Soon</div>
          </div>
          <div className={`font-display font-bold text-2xl ${summary.dueSoon > 0 ? "text-amber-500" : ""}`}>
            {summary.dueSoon}
          </div>
        </Card>
      </div>

      {/* Monthly Checklist */}
      <Card className="data-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold truncate">
              {new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" })} Payment Checklist
            </CardTitle>
            <Badge variant="outline" className="w-fit">
              {paidThisMonth.length} / {commitments.length} Paid
            </Badge>
          </div>
          <Progress 
            value={(paidThisMonth.length / Math.max(1, commitments.length)) * 100} 
            className="h-2 mt-2" 
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overdue Section */}
          {overdueCommitments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Overdue
              </h3>
              {overdueCommitments.map((commitment) => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onTogglePaid={(isPaid) => handlePaymentToggle(commitment, isPaid)}
                  onEdit={() => handleEdit(commitment)}
                  onDelete={() => setDeleteId(commitment.id)}
                  onTerminate={() => setTerminateCommitment(commitment)}
                  onModifyAmount={() => {
                    setModifyCommitment(commitment);
                    setNewAmount(commitment.amount);
                  }}
                  formatCurrency={formatCurrency}
                  getTypeInfo={getTypeInfo}
                  isPending={paymentMutation.isPending}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Due Soon Section */}
          {dueSoonCommitments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Due Soon (Next 7 Days)
              </h3>
              {dueSoonCommitments.map((commitment) => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onTogglePaid={(isPaid) => handlePaymentToggle(commitment, isPaid)}
                  onEdit={() => handleEdit(commitment)}
                  onDelete={() => setDeleteId(commitment.id)}
                  onTerminate={() => setTerminateCommitment(commitment)}
                  onModifyAmount={() => {
                    setModifyCommitment(commitment);
                    setNewAmount(commitment.amount);
                  }}
                  formatCurrency={formatCurrency}
                  getTypeInfo={getTypeInfo}
                  isPending={paymentMutation.isPending}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Upcoming Section */}
          {unpaidCommitments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming
              </h3>
              {unpaidCommitments.map((commitment) => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onTogglePaid={(isPaid) => handlePaymentToggle(commitment, isPaid)}
                  onEdit={() => handleEdit(commitment)}
                  onDelete={() => setDeleteId(commitment.id)}
                  onTerminate={() => setTerminateCommitment(commitment)}
                  onModifyAmount={() => {
                    setModifyCommitment(commitment);
                    setNewAmount(commitment.amount);
                  }}
                  formatCurrency={formatCurrency}
                  getTypeInfo={getTypeInfo}
                  isPending={paymentMutation.isPending}
                  viewMode={viewMode}
                />
              ))}
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
              {showPaidSection && paidThisMonth.map((commitment) => (
                <CommitmentCard
                  key={commitment.id}
                  commitment={commitment}
                  onTogglePaid={(isPaid) => handlePaymentToggle(commitment, isPaid)}
                  onEdit={() => handleEdit(commitment)}
                  onDelete={() => setDeleteId(commitment.id)}
                  onTerminate={() => setTerminateCommitment(commitment)}
                  onModifyAmount={() => {
                    setModifyCommitment(commitment);
                    setNewAmount(commitment.amount);
                  }}
                  formatCurrency={formatCurrency}
                  getTypeInfo={getTypeInfo}
                  isPending={paymentMutation.isPending}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {commitments.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-lg font-semibold mb-2">No Commitments Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your bills, loans, and recurring payments to track them
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Commitment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commitment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the commitment and all its payment records.
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
      <Dialog open={!!terminateCommitment} onOpenChange={(open) => !open && setTerminateCommitment(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" />
              Terminate Commitment
            </DialogTitle>
            <DialogDescription>
              This will archive &ldquo;{terminateCommitment?.name}&rdquo; and remove it from your monthly checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={terminateEffectiveDate}
                onChange={(e) => setTerminateEffectiveDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The commitment will be removed from checklist starting from this date
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Cancelled subscription, Loan fully paid, etc."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTerminateCommitment(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (terminateCommitment) {
                  terminateMutation.mutate({
                    id: terminateCommitment.id,
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
              Terminate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modify Amount Dialog */}
      <Dialog open={!!modifyCommitment} onOpenChange={(open) => !open && setModifyCommitment(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Upgrade/Downgrade Amount
            </DialogTitle>
            <DialogDescription>
              Change the amount for &ldquo;{modifyCommitment?.name}&rdquo; 
              (Current: {modifyCommitment && formatCurrency(modifyCommitment.amount)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Amount (RM)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter new amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              {modifyCommitment && newAmount && parseFloat(newAmount) !== parseFloat(modifyCommitment.amount) && (
                <p className={`text-xs ${parseFloat(newAmount) > parseFloat(modifyCommitment.amount) ? "text-amber-500" : "text-emerald-500"}`}>
                  {parseFloat(newAmount) > parseFloat(modifyCommitment.amount) ? (
                    <>↑ Upgrade (+{formatCurrency(parseFloat(newAmount) - parseFloat(modifyCommitment.amount))})</>
                  ) : (
                    <>↓ Downgrade (-{formatCurrency(parseFloat(modifyCommitment.amount) - parseFloat(newAmount))})</>
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
                The new amount will apply to payments from this date onwards
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="e.g., Plan upgrade, Price increase, etc."
                value={modifyReason}
                onChange={(e) => setModifyReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModifyCommitment(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (modifyCommitment && newAmount) {
                  modifyAmountMutation.mutate({
                    id: modifyCommitment.id,
                    data: {
                      newAmount,
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
              Update Amount
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Commitment Card Component
function CommitmentCard({
  commitment,
  onTogglePaid,
  onEdit,
  onDelete,
  onTerminate,
  onModifyAmount,
  formatCurrency,
  getTypeInfo,
  isPending,
  viewMode = "list",
}: {
  commitment: Commitment;
  onTogglePaid: (isPaid: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTerminate?: () => void;
  onModifyAmount?: () => void;
  formatCurrency: (amount: string | number) => string;
  getTypeInfo: (type: string) => typeof COMMITMENT_TYPES[0];
  isPending: boolean;
  viewMode?: "list" | "grid";
}) {
  const typeInfo = getTypeInfo(commitment.commitmentType);
  const TypeIcon = typeInfo.icon;
  const isPaid = commitment.currentPayment?.isPaid;
  
  // Calculate total paid for this commitment
  const { totalPaid, paymentsMade, totalExpected } = calculateTotalPaid(commitment);

  return (
    <div
      className={`p-4 rounded-lg border transition-colors group ${
        isPaid
          ? "border-emerald-500/30 bg-emerald-500/5"
          : commitment.isOverdue
          ? "border-red-500/30 bg-red-500/5"
          : commitment.isDueSoon
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Checkbox
            checked={isPaid}
            onCheckedChange={(checked: boolean | "indeterminate") => onTogglePaid(!!checked)}
            disabled={isPending}
            className="w-5 h-5 shrink-0"
          />
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isPaid ? "bg-emerald-500/10" : "bg-muted"
          }`}>
            <TypeIcon className={`w-5 h-5 ${isPaid ? "text-emerald-500" : typeInfo.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-medium truncate ${isPaid ? "line-through text-muted-foreground" : ""}`}>
                {commitment.name}
              </p>
              {commitment.isPriority && (
                <Badge variant="outline" className="text-xs shrink-0">Priority</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate flex-wrap">
              <span className="truncate">{commitment.payee || typeInfo.label}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">
                Due {new Date(commitment.nextDueDate).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {commitment.daysUntilDue < 0 ? (
                <span className="text-red-500">({Math.abs(commitment.daysUntilDue)} days overdue)</span>
              ) : commitment.daysUntilDue === 0 ? (
                <span className="text-amber-500">(Due today)</span>
              ) : commitment.daysUntilDue <= 7 ? (
                <span className="text-amber-500">({commitment.daysUntilDue} days left)</span>
              ) : null}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-display font-semibold text-lg ${isPaid ? "text-muted-foreground" : ""}`}>
              {formatCurrency(commitment.amount)}
            </p>
            <p className="text-xs text-muted-foreground">/ {commitment.frequency}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Details
              </DropdownMenuItem>
              {onModifyAmount && (
                <DropdownMenuItem onClick={onModifyAmount}>
                  <ArrowUpCircle className="w-4 h-4 mr-2" /> Upgrade/Downgrade
                </DropdownMenuItem>
              )}
              {onTerminate && (
                <DropdownMenuItem onClick={onTerminate} className="text-amber-500">
                  <XCircle className="w-4 h-4 mr-2" /> Terminate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Total Paid Progress Section */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Total Paid ({paymentsMade} of {totalExpected} payments)
          </span>
          <span className="font-semibold text-emerald-500">{formatCurrency(totalPaid)}</span>
        </div>
        {commitment.totalAmount && parseFloat(commitment.totalAmount) > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Loan Progress</span>
              <span className="text-muted-foreground">
                {((totalPaid / parseFloat(commitment.totalAmount)) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(totalPaid / parseFloat(commitment.totalAmount)) * 100} 
              className="h-1.5" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(parseFloat(commitment.totalAmount) - totalPaid)} remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
