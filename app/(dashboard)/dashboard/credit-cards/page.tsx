"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Plus,
  Loader2,
  CreditCard as CreditCardIcon,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  Calendar,
  DollarSign,
  Star,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { CreditCard3D, CARD_COLORS, CardColorPreview, CARD_COLOR_OPTIONS } from "@/components/ui/credit-card-3d";
import { ExpenseDonutChart } from "@/components/charts/ExpenseDonutChart";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// Types
interface CreditCard {
  id: string;
  bankName: string;
  cardType: string;
  cardName: string;
  cardColor: string;
  cardDesign: string;
  lastFourDigits?: string | null;
  creditLimit?: string | null;
  billingCycleDay?: number | null;
  paymentDueDay?: number | null;
  isActive: boolean;
  isPrimary: boolean;
  notes?: string | null;
  createdAt: string;
  stats?: {
    currentMonthSpending: number;
    currentMonthTransactions: number;
    totalSpending: number;
    totalTransactions: number;
    utilizationRate: number | null;
    latestStatement: Record<string, unknown> | null;
    categoryBreakdown?: Array<{
      name: string;
      amount: number;
    }>;
  };
}

// Malaysian Banks
const MALAYSIAN_BANKS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "OCBC Bank",
  "UOB Malaysia",
  "HSBC Malaysia",
  "Standard Chartered",
  "Citibank Malaysia",
  "Alliance Bank",
  "Affin Bank",
  "Bank Muamalat",
  "MBSB Bank",
  "Agrobank",
];

const CARD_TYPES = [
  "Visa",
  "Mastercard",
  "American Express",
  "UnionPay",
  "JCB",
  "Diners Club",
];

async function fetchCreditCards(): Promise<CreditCard[]> {
  const res = await fetch("/api/credit-cards?includeStats=true");
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export default function CreditCardsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editCard, setEditCard] = useState<CreditCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    bankName: "",
    cardType: "Visa",
    cardName: "",
    cardColor: "midnight",
    lastFourDigits: "",
    creditLimit: "",
    billingCycleDay: "",
    paymentDueDay: "",
    isPrimary: false,
    notes: "",
  });

  // Fetch credit cards
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: fetchCreditCards,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : null,
          billingCycleDay: data.billingCycleDay ? parseInt(data.billingCycleDay) : null,
          paymentDueDay: data.paymentDueDay ? parseInt(data.paymentDueDay) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Credit card added successfully!");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to add credit card");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/credit-cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : null,
          billingCycleDay: data.billingCycleDay ? parseInt(data.billingCycleDay) : null,
          paymentDueDay: data.paymentDueDay ? parseInt(data.paymentDueDay) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Credit card updated successfully!");
      setEditCard(null);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update credit card");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Credit card deleted successfully!");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete credit card");
    },
  });

  const resetForm = () => {
    setFormData({
      bankName: "",
      cardType: "Visa",
      cardName: "",
      cardColor: "midnight",
      lastFourDigits: "",
      creditLimit: "",
      billingCycleDay: "",
      paymentDueDay: "",
      isPrimary: false,
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editCard) {
      updateMutation.mutate({ id: editCard.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (card: CreditCard) => {
    setEditCard(card);
    setFormData({
      bankName: card.bankName,
      cardType: card.cardType,
      cardName: card.cardName,
      cardColor: CARD_COLORS[card.cardColor] ? card.cardColor : "midnight",
      lastFourDigits: card.lastFourDigits || "",
      creditLimit: card.creditLimit || "",
      billingCycleDay: card.billingCycleDay?.toString() || "",
      paymentDueDay: card.paymentDueDay?.toString() || "",
      isPrimary: card.isPrimary,
      notes: card.notes || "",
    });
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Calculate totals
  const totalMonthlySpending = creditCards.reduce(
    (sum, card) => sum + (card.stats?.currentMonthSpending || 0),
    0
  );
  const totalCreditLimit = creditCards.reduce(
    (sum, card) => sum + (card.creditLimit ? parseFloat(card.creditLimit) : 0),
    0
  );
  const activeCards = creditCards.filter((c) => c.isActive).length;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading credit cards..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your credit card spending
          </p>
        </div>
        <Dialog open={isAddDialogOpen || !!editCard} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditCard(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Credit Card
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editCard ? "Edit Credit Card" : "Add New Credit Card"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              {/* Card Preview */}
              <div className="flex justify-center">
                <CreditCard3D
                  bankName={formData.bankName || "Bank Name"}
                  cardType={formData.cardType}
                  cardName={formData.cardName || "Card Name"}
                  cardColor={formData.cardColor}
                  lastFourDigits={formData.lastFourDigits || undefined}
                  isPrimary={formData.isPrimary}
                  size="sm"
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank *</Label>
                  <Select
                    value={formData.bankName}
                    onValueChange={(v) => setFormData({ ...formData, bankName: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {MALAYSIAN_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardType">Card Type *</Label>
                  <Select
                    value={formData.cardType}
                    onValueChange={(v) => setFormData({ ...formData, cardType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardName">Card Name *</Label>
                <Input
                  id="cardName"
                  value={formData.cardName}
                  onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                  placeholder="e.g., Maybank Visa Infinite"
                  required
                />
              </div>

              {/* Card Design Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Card Design</Label>
                  <span className="text-xs text-primary font-medium">
                    {formData.cardColor.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">22 premium designs available</p>
                <div className="grid grid-cols-11 gap-1.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                  {CARD_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, cardColor: color })}
                      title={color.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-lg"
                    >
                      <CardColorPreview colorKey={color} isSelected={formData.cardColor === color} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastFourDigits">Last 4 Digits</Label>
                <Input
                  id="lastFourDigits"
                  value={formData.lastFourDigits}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setFormData({ ...formData, lastFourDigits: val });
                  }}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit (RM)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    placeholder="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDueDay">Payment Due Day</Label>
                  <Input
                    id="paymentDueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.paymentDueDay}
                    onChange={(e) => setFormData({ ...formData, paymentDueDay: e.target.value })}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this card..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="isPrimary" className="font-normal cursor-pointer">
                  Set as primary card
                </Label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditCard(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editCard ? "Update Card" : "Add Card"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="data-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month&apos;s Spending</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalMonthlySpending)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="data-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit Limit</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalCreditLimit)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="data-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Cards</p>
                  <p className="text-2xl font-bold mt-1">{activeCards}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Credit Cards Grid */}
      {creditCards.length === 0 ? (
        <Card className="data-card">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <CreditCardIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Credit Cards Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your credit cards to track spending, monitor utilization, and manage payments
              all in one place.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {creditCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="data-card overflow-hidden">
                <CardContent className="p-0">
                  {/* 3D Card */}
                  <div className="flex justify-center pt-6 pb-4">
                    <CreditCard3D
                      bankName={card.bankName}
                      cardType={card.cardType}
                      cardName={card.cardName}
                      cardColor={card.cardColor}
                      lastFourDigits={card.lastFourDigits}
                      isPrimary={card.isPrimary}
                      size="sm"
                      onClick={() => setSelectedCard(card)}
                    />
                  </div>

                  {/* Card Stats */}
                  <div className="p-6 pt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(card.stats?.currentMonthSpending || 0)}
                        </p>
                      </div>
                      {card.creditLimit && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Utilization</p>
                          <p
                            className={`text-lg font-semibold ${
                              (card.stats?.utilizationRate || 0) > 70
                                ? "text-red-500"
                                : (card.stats?.utilizationRate || 0) > 40
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {(card.stats?.utilizationRate || 0).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {card.creditLimit && (
                      <div className="space-y-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              (card.stats?.utilizationRate || 0) > 70
                                ? "bg-red-500"
                                : (card.stats?.utilizationRate || 0) > 40
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(card.stats?.utilizationRate || 0, 100)}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(card.stats?.currentMonthSpending || 0)} used</span>
                          <span>{formatCurrency(card.creditLimit)} limit</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {card.stats?.currentMonthTransactions || 0} transactions this month
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(card)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(card.id)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The card will be removed and transactions linked to
              this card will have their payment method cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Spending Analysis Section */}
      {creditCards.length > 0 && (
        <div className="mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold">Spending Analysis</h2>
              <p className="text-muted-foreground mt-1">
                Detailed breakdown for <span className="font-medium text-primary">
                  {selectedCard ? selectedCard.cardName : creditCards[0]?.cardName}
                </span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Chart */}
             <Card className="data-card lg:col-span-2">
               <CardHeader>
                 <CardTitle>Category Breakdown (This Month)</CardTitle>
               </CardHeader>
               <CardContent>
                  {(selectedCard || creditCards[0])?.stats?.categoryBreakdown && 
                   (selectedCard || creditCards[0])!.stats!.categoryBreakdown!.length > 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <ExpenseDonutChart data={(selectedCard || creditCards[0])!.stats!.categoryBreakdown!} />
                    </div>
                  ) : (
                    <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <CreditCardIcon className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="font-medium">No spending data for this month</p>
                      <p className="text-sm opacity-70 mt-1">Transactions will appear here once recorded</p>
                    </div>
                  )}
               </CardContent>
             </Card>

             {/* Summary / Details */}
             <Card className="data-card">
                <CardHeader>
                  <CardTitle>Card Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   {(selectedCard || creditCards[0]) && (
                     <>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total Lifetime Spending</p>
                          <p className="text-2xl font-bold font-display">
                            {formatCurrency((selectedCard || creditCards[0]).stats?.totalSpending || 0)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total Transactions</p>
                          <p className="text-2xl font-bold font-display">
                            {(selectedCard || creditCards[0]).stats?.totalTransactions || 0}
                          </p>
                        </div>

                        <div className="pt-6 border-t border-border">
                          <h4 className="text-sm font-semibold mb-4">Card Details</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bank</span>
                              <span className="font-medium">{(selectedCard || creditCards[0]).bankName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type</span>
                              <span className="font-medium">{(selectedCard || creditCards[0]).cardType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ending In</span>
                              <span className="font-medium font-mono">
                                •••• {(selectedCard || creditCards[0]).lastFourDigits || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payment Due</span>
                              <span className="font-medium">
                                Day {(selectedCard || creditCards[0]).paymentDueDay || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                     </>
                   )}
                </CardContent>
             </Card>
          </div>
        </div>
      )}
    </div>
  );
}
