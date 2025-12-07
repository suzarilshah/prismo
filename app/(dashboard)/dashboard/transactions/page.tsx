"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Plus, Search, Trash2, Receipt, AlertTriangle,
  Store, ChevronDown, Check, PlusCircle, Sparkles, Tag,
  Pencil, X, CreditCard, Calendar, DollarSign, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { CategoryIcon } from "@/lib/category-icons";
import { PaymentMethodSelect, getPaymentMethodLabel } from "@/components/ui/payment-method-select";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "income" | "expense";
  vendor?: string;
  vendorId?: string;
  category?: any;
  categoryId?: string;
  isTaxDeductible?: boolean;
  invoiceStatus?: string;
  receiptUrl?: string;
  notes?: string;
  paymentMethod?: string;
  creditCardId?: string;
  creditCard?: { id: string; cardName: string; lastFourDigits?: string };
}

interface Vendor {
  id: string;
  name: string;
  categoryId?: string;
  category?: { name: string; color?: string };
  isActive?: boolean;
}

// Tax-deductible categories (LHDN eligible)
const TAX_DEDUCTIBLE_CATEGORIES = [
  "medical", "education", "lifestyle", "sspn", "insurance", "epf", 
  "prs", "ebook", "sports", "breastfeeding", "childcare", "parents"
];

// Special category ID for "Other"
const OTHER_CATEGORY_ID = "other";

async function fetchTransactions() {
  const res = await fetch("/api/transactions?limit=100");
  if (!res.ok) {
    if (res.status === 401) throw new Error("Not authenticated");
    throw new Error("Failed to fetch transactions");
  }
  return (await res.json()).data || [];
}

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) return [];
  return (await res.json()).data || [];
}

async function fetchVendors() {
  const res = await fetch("/api/vendors");
  if (!res.ok) return [];
  return (await res.json()).data || [];
}

async function createVendor(vendor: { name: string; categoryId?: string }) {
  const res = await fetch("/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error("Failed to create vendor");
  return res.json();
}

async function createTransaction(transaction: any) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error("Failed to create transaction");
  return res.json();
}

async function deleteTransaction(id: string) {
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete transaction");
  return res.json();
}

async function updateTransaction(id: string, data: Partial<Transaction>) {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return res.json();
}

export default function TransactionsPage() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    vendorId: "",
    vendorName: "",
    // "Other" category notes
    otherCategoryNotes: "",
    // Income-specific fields
    incomeType: "salary" as "salary" | "bonus" | "freelance" | "investment" | "commission" | "other",
    incomeMonth: currentMonth,
    incomeYear: currentYear,
    // Payment method
    paymentMethod: "",
    creditCardId: null as string | null,
    // Tax-deductible fields
    isTaxDeductible: false,
    taxCategory: "",
    invoiceStatus: "not_required" as "not_required" | "pending" | "uploaded",
    receiptUrl: "",
    // Additional notes for spending forecasting
    notes: "",
    isRecurring: false,
    recurringFrequency: "monthly" as "weekly" | "monthly" | "yearly",
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    enabled: isAuthenticated,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isAuthenticated,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
    enabled: isAuthenticated,
  });

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    return vendors.filter((v: Vendor) => 
      v.name.toLowerCase().includes(vendorSearch.toLowerCase())
    );
  }, [vendors, vendorSearch]);

  // Check if we should show "Create new vendor" option
  const showCreateVendor = vendorSearch.length > 0 && 
    !vendors.some((v: Vendor) => v.name.toLowerCase() === vendorSearch.toLowerCase());

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const createdName = data.data?.name || vendorSearch;
      setNewTransaction({ ...newTransaction, vendorId: data.data?.id || "", vendorName: createdName });
      setVendorSearch("");
      setVendorOpen(false);
      setIsCreatingVendor(false);
      toast.success("Vendor Created", {
        description: `"${createdName}" has been added to your vendors.`,
      });
    },
    onError: (error) => {
      setIsCreatingVendor(false);
      toast.error("Failed to create vendor", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Check if selected category is tax-deductible
  const selectedCategory = categories?.find((c: any) => c.id === newTransaction.categoryId);
  const isCategoryTaxDeductible = selectedCategory?.name && 
    TAX_DEDUCTIBLE_CATEGORIES.some(cat => 
      selectedCategory.name.toLowerCase().includes(cat)
    );

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["tax-deductions"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      const amount = new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
      }).format(parseFloat(variables.amount));
      
      toast.success(
        variables.type === "income" ? "Income Recorded" : "Expense Added",
        {
          description: `${variables.description || "Transaction"} for ${amount} has been saved.`,
        }
      );
      
      setIsAddDialogOpen(false);
      setVendorSearch("");
      setNewTransaction({
        description: "",
        amount: "",
        type: "expense",
        categoryId: "",
        date: new Date().toISOString().split("T")[0],
        vendorId: "",
        vendorName: "",
        otherCategoryNotes: "",
        incomeType: "salary",
        incomeMonth: currentMonth,
        incomeYear: currentYear,
        paymentMethod: "",
        creditCardId: null,
        isTaxDeductible: false,
        taxCategory: "",
        invoiceStatus: "not_required",
        receiptUrl: "",
        notes: "",
        isRecurring: false,
        recurringFrequency: "monthly",
      });
    },
    onError: (error) => {
      toast.error("Failed to add transaction", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction Deleted", {
        description: "The transaction has been permanently removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete transaction", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setIsEditSheetOpen(false);
      setEditingTransaction(null);
      toast.success("Transaction Updated", {
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update transaction", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Open edit sheet with transaction data
  const openEditSheet = (tx: Transaction) => {
    setEditingTransaction({
      ...tx,
      paymentMethod: tx.paymentMethod || "",
      creditCardId: tx.creditCardId || "",
    });
    setIsEditSheetOpen(true);
  };

  // Handle edit form submission
  const handleEditSubmit = () => {
    if (!editingTransaction) return;
    updateMutation.mutate({
      id: editingTransaction.id,
      data: {
        description: editingTransaction.description,
        amount: editingTransaction.amount,
        date: editingTransaction.date,
        categoryId: editingTransaction.categoryId,
        paymentMethod: editingTransaction.paymentMethod,
        creditCardId: editingTransaction.creditCardId,
        notes: editingTransaction.notes,
        isTaxDeductible: editingTransaction.isTaxDeductible,
      },
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  // Memoize filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx: Transaction) => {
      const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tx.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || tx.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  // Group transactions by month/year
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { label: string; transactions: Transaction[]; monthTotal: { income: number; expense: number } }> = {};
    
    filteredTransactions.forEach((tx: Transaction) => {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
      
      if (!groups[key]) {
        groups[key] = { label, transactions: [], monthTotal: { income: 0, expense: 0 } };
      }
      groups[key].transactions.push(tx);
      if (tx.type === "income") {
        groups[key].monthTotal.income += parseFloat(tx.amount);
      } else {
        groups[key].monthTotal.expense += parseFloat(tx.amount);
      }
    });

    // Sort by date descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  }, [filteredTransactions]);

  // Calculate totals
  const { totalIncome, totalExpenses } = useMemo(() => ({
    totalIncome: filteredTransactions
      .filter((tx: Transaction) => tx.type === "income")
      .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount), 0),
    totalExpenses: filteredTransactions
      .filter((tx: Transaction) => tx.type === "expense")
      .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount), 0),
  }), [filteredTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading transactions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and categorize your financial activity</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Grocery shopping"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (MYR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(value: "income" | "expense") => 
                      setNewTransaction({ ...newTransaction, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTransaction.categoryId}
                  onValueChange={(value) => setNewTransaction({ 
                    ...newTransaction, 
                    categoryId: value,
                    otherCategoryNotes: value === OTHER_CATEGORY_ID ? newTransaction.otherCategoryNotes : ""
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.filter((c: any) => c.type === newTransaction.type).map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon icon={category.icon} className="w-4 h-4 text-muted-foreground" />
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_CATEGORY_ID}>
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        Other (specify below)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Other category notes field */}
              {newTransaction.categoryId === OTHER_CATEGORY_ID && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="otherNotes" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    What type of expense is this?
                  </Label>
                  <Input
                    id="otherNotes"
                    placeholder="e.g., Beauty expenses, Pet care, Gifts..."
                    value={newTransaction.otherCategoryNotes}
                    onChange={(e) => setNewTransaction({ ...newTransaction, otherCategoryNotes: e.target.value })}
                    className="border-amber-500/30 focus:border-amber-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps us categorize and track your spending patterns better
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>
                
                {/* Enhanced Vendor Combobox with Search & Create */}
                <div className="space-y-2">
                  <Label>Vendor / Merchant</Label>
                  <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={vendorOpen}
                        className="w-full justify-between font-normal h-10"
                      >
                        {newTransaction.vendorName ? (
                          <span className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            {newTransaction.vendorName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search or add vendor...</span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search vendors..." 
                          value={vendorSearch}
                          onValueChange={setVendorSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {vendorSearch ? (
                              <div className="py-2 px-3 text-center">
                                <p className="text-sm text-muted-foreground mb-2">No vendor found</p>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground py-2">Type to search...</p>
                            )}
                          </CommandEmpty>
                          
                          {/* Create new vendor option */}
                          {showCreateVendor && (
                            <>
                              <CommandGroup heading="Create New">
                                <CommandItem
                                  onSelect={() => {
                                    setIsCreatingVendor(true);
                                    createVendorMutation.mutate({ 
                                      name: vendorSearch,
                                      categoryId: newTransaction.categoryId || undefined
                                    });
                                  }}
                                  className="cursor-pointer"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                  <span>Create &ldquo;<strong>{vendorSearch}</strong>&rdquo;</span>
                                  {isCreatingVendor && <LoadingSpinner size="xs" variant="minimal" className="ml-auto" />}
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                            </>
                          )}
                          
                          {/* Existing vendors */}
                          {filteredVendors.length > 0 && (
                            <CommandGroup heading="Existing Vendors">
                              {filteredVendors.slice(0, 10).map((vendor: Vendor) => (
                                <CommandItem
                                  key={vendor.id}
                                  value={vendor.name}
                                  onSelect={() => {
                                    setNewTransaction({ 
                                      ...newTransaction, 
                                      vendorId: vendor.id, 
                                      vendorName: vendor.name 
                                    });
                                    setVendorOpen(false);
                                    setVendorSearch("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span>{vendor.name}</span>
                                  {vendor.category && (
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      {vendor.category.name}
                                    </Badge>
                                  )}
                                  {newTransaction.vendorId === vendor.id && (
                                    <Check className="ml-2 h-4 w-4 text-emerald-500" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          
                          {/* Clear selection option */}
                          {newTransaction.vendorId && (
                            <>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setNewTransaction({ ...newTransaction, vendorId: "", vendorName: "" });
                                    setVendorOpen(false);
                                  }}
                                  className="cursor-pointer text-muted-foreground"
                                >
                                  <span>Clear selection</span>
                                </CommandItem>
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Search existing or create new vendor
                  </p>
                </div>
              </div>

              {/* Payment Method - Only for expenses */}
              {newTransaction.type === "expense" && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <PaymentMethodSelect
                    value={newTransaction.paymentMethod}
                    creditCardId={newTransaction.creditCardId}
                    onValueChange={(method, cardId) => 
                      setNewTransaction({ 
                        ...newTransaction, 
                        paymentMethod: method, 
                        creditCardId: cardId ?? null
                      })
                    }
                    placeholder="Select payment method (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Track which payment method you used for this expense
                  </p>
                </div>
              )}

              {/* Tax-deductible alert and checkbox for expenses */}
              {newTransaction.type === "expense" && (
                <div className="space-y-3">
                  {isCategoryTaxDeductible && (
                    <Alert className="bg-emerald-500/10 border-emerald-500/30">
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      <AlertDescription className="text-emerald-500">
                        <strong>Tax Relief Eligible!</strong> This category qualifies for LHDN tax relief. 
                        Mark it as tax-deductible and upload your invoice for bookkeeping.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border">
                    <Checkbox
                      id="taxDeductible"
                      checked={newTransaction.isTaxDeductible}
                      onCheckedChange={(checked) => 
                        setNewTransaction({ 
                          ...newTransaction, 
                          isTaxDeductible: checked as boolean,
                          invoiceStatus: checked ? "pending" : "not_required"
                        })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="taxDeductible" className="text-sm font-medium cursor-pointer">
                        Mark as Tax Deductible
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        This expense will appear in your Tax Management page for LHDN filing
                      </p>
                    </div>
                    {newTransaction.isTaxDeductible && (
                      <Badge variant="secondary" className="text-emerald-500 border-emerald-500/30">
                        <Receipt className="w-3 h-3 mr-1" />
                        Tax Relief
                      </Badge>
                    )}
                  </div>

                  {newTransaction.isTaxDeductible && (
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <AlertDescription className="text-amber-500">
                        <strong>Invoice Reminder:</strong> For tax deductions, keep your receipt/invoice. 
                        You can upload it later in the Tax Management page under Bookkeeping tab.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Income-specific fields */}
              {newTransaction.type === "income" && (
                <div className="space-y-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-sm font-medium text-emerald-500">Income Details</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incomeType">Income Type</Label>
                      <Select
                        value={newTransaction.incomeType}
                        onValueChange={(value: typeof newTransaction.incomeType) => 
                          setNewTransaction({ ...newTransaction, incomeType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">💼 Salary</SelectItem>
                          <SelectItem value="bonus">🎁 Bonus</SelectItem>
                          <SelectItem value="freelance">💻 Freelance</SelectItem>
                          <SelectItem value="investment">📈 Investment</SelectItem>
                          <SelectItem value="commission">💵 Commission</SelectItem>
                          <SelectItem value="other">📋 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="incomeMonth">For Month</Label>
                      <Select
                        value={newTransaction.incomeMonth.toString()}
                        onValueChange={(value) => 
                          setNewTransaction({ ...newTransaction, incomeMonth: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2024, i, 1).toLocaleString("default", { month: "long" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="incomeYear">Year</Label>
                      <Select
                        value={newTransaction.incomeYear.toString()}
                        onValueChange={(value) => 
                          setNewTransaction({ ...newTransaction, incomeYear: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => createMutation.mutate(newTransaction)}
                disabled={createMutation.isPending || !newTransaction.description || !newTransaction.amount}
              >
                {createMutation.isPending ? (
                  <>
                    <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
                    Adding...
                  </>
                ) : (
                  "Add Transaction"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="data-card p-4 md:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Income</div>
          <div className="font-display font-semibold text-xl md:text-3xl tracking-tight text-emerald-500">
            {formatCurrency(totalIncome)}
          </div>
        </Card>
        
        <Card className="data-card p-4 md:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Expenses</div>
          <div className="font-display font-semibold text-xl md:text-3xl tracking-tight text-red-500">
            {formatCurrency(totalExpenses)}
          </div>
        </Card>
        
        <Card className="data-card p-4 md:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Net Cash Flow</div>
          <div className="font-display font-semibold text-xl md:text-3xl tracking-tight">
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </Card>
      </div>

      <Card className="data-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")} size="sm">
              All
            </Button>
            <Button variant={filterType === "income" ? "default" : "outline"} onClick={() => setFilterType("income")} size="sm">
              Income
            </Button>
            <Button variant={filterType === "expense" ? "default" : "outline"} onClick={() => setFilterType("expense")} size="sm">
              Expenses
            </Button>
          </div>
        </div>
      </Card>

      {/* Grouped Transactions by Month */}
      {filteredTransactions.length === 0 ? (
        <Card className="data-card">
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No transactions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTransactions.map((group) => (
            <Card key={group.key} className="data-card overflow-hidden">
              {/* Month Header */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="font-display font-semibold text-base md:text-lg">{group.label}</h3>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                    <span className="text-emerald-500 font-medium">
                      +{formatCurrency(group.monthTotal.income)}
                    </span>
                    <span className="text-red-500 font-medium">
                      -{formatCurrency(group.monthTotal.expense)}
                    </span>
                    <span className={`font-semibold ${
                      group.monthTotal.income - group.monthTotal.expense >= 0 
                        ? "text-emerald-500" 
                        : "text-red-500"
                    }`}>
                      Net: {formatCurrency(group.monthTotal.income - group.monthTotal.expense)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {group.transactions.length} transaction{group.transactions.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Transactions List */}
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {group.transactions.map((tx: Transaction) => (
                    <div
                      key={tx.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 py-3 md:py-4 hover:bg-muted/20 transition-colors group gap-2 sm:gap-0"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}>
                          {tx.category?.icon ? (
                            <CategoryIcon 
                              icon={tx.category.icon} 
                              className={`w-5 h-5 ${tx.type === "income" ? "text-emerald-500" : "text-red-500"}`} 
                            />
                          ) : (
                            <span className={`text-lg ${tx.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                              {tx.type === "income" ? "+" : "-"}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tx.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{new Date(tx.date).toLocaleDateString("en-MY", { 
                              weekday: "short",
                              day: "numeric"
                            })}</span>
                            {tx.category && (
                              <>
                                <span>•</span>
                                <span className="px-2 py-0.5 rounded-full bg-muted">{tx.category.name}</span>
                              </>
                            )}
                            {tx.vendor && (
                              <>
                                <span>•</span>
                                <span>{tx.vendor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
                        {/* Payment Method Badge - Hidden on mobile */}
                        {tx.paymentMethod && (
                          <Badge variant="outline" className="text-xs font-normal opacity-60 group-hover:opacity-100 transition-opacity hidden md:flex">
                            <CreditCard className="w-3 h-3 mr-1" />
                            {getPaymentMethodLabel(tx.paymentMethod)}
                            {tx.creditCard?.lastFourDigits && ` •••• ${tx.creditCard.lastFourDigits}`}
                          </Badge>
                        )}
                        
                        <div className={`font-display font-semibold text-base md:text-lg ${
                          tx.type === "income" ? "text-emerald-500" : "text-foreground"
                        }`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </div>
                        
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditSheet(tx)}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (confirm("Delete this transaction?")) {
                                deleteMutation.mutate(tx.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Transaction Sheet */}
      <AnimatePresence>
        {isEditSheetOpen && editingTransaction && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setIsEditSheetOpen(false);
                setEditingTransaction(null);
              }}
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div>
                  <h2 className="font-display font-semibold text-xl">Edit Transaction</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Update details and payment method
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditSheetOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Transaction Preview Card */}
                <div className={`p-4 rounded-xl border ${
                  editingTransaction.type === "income" 
                    ? "bg-emerald-500/5 border-emerald-500/20" 
                    : "bg-muted/50 border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        editingTransaction.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}>
                        {editingTransaction.category?.icon ? (
                          <CategoryIcon 
                            icon={editingTransaction.category.icon} 
                            className={`w-5 h-5 ${editingTransaction.type === "income" ? "text-emerald-500" : "text-red-500"}`} 
                          />
                        ) : (
                          <DollarSign className={`w-5 h-5 ${editingTransaction.type === "income" ? "text-emerald-500" : "text-red-500"}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{editingTransaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(editingTransaction.date).toLocaleDateString("en-MY", { 
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={`font-display font-bold text-xl ${
                      editingTransaction.type === "income" ? "text-emerald-500" : "text-foreground"
                    }`}>
                      {editingTransaction.type === "income" ? "+" : "-"}{formatCurrency(editingTransaction.amount)}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Input
                      id="edit-description"
                      value={editingTransaction.description}
                      onChange={(e) => setEditingTransaction({
                        ...editingTransaction,
                        description: e.target.value
                      })}
                      placeholder="Transaction description"
                      className="h-11"
                    />
                  </div>

                  {/* Amount & Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-amount" className="text-sm font-medium">
                        Amount (RM)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="edit-amount"
                          type="number"
                          step="0.01"
                          value={editingTransaction.amount}
                          onChange={(e) => setEditingTransaction({
                            ...editingTransaction,
                            amount: e.target.value
                          })}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-date" className="text-sm font-medium">
                        Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="edit-date"
                          type="date"
                          value={editingTransaction.date?.split("T")[0]}
                          onChange={(e) => setEditingTransaction({
                            ...editingTransaction,
                            date: e.target.value
                          })}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select
                      value={editingTransaction.categoryId || ""}
                      onValueChange={(value) => setEditingTransaction({
                        ...editingTransaction,
                        categoryId: value
                      })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              {cat.icon && <CategoryIcon icon={cat.icon} className="w-4 h-4" />}
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method - Beautiful Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">Payment Method</Label>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border">
                      <PaymentMethodSelect
                        value={editingTransaction.paymentMethod}
                        creditCardId={editingTransaction.creditCardId}
                        onValueChange={(method, cardId) => setEditingTransaction({
                          ...editingTransaction,
                          paymentMethod: method,
                          creditCardId: cardId || undefined
                        })}
                        showCreditCards={true}
                      />
                      {editingTransaction.paymentMethod && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 pt-3 border-t border-border/50"
                        >
                          <p className="text-xs text-muted-foreground">
                            Current: <span className="font-medium text-foreground">
                              {getPaymentMethodLabel(editingTransaction.paymentMethod)}
                              {editingTransaction.creditCard?.lastFourDigits && 
                                ` (•••• ${editingTransaction.creditCard.lastFourDigits})`
                              }
                            </span>
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes" className="text-sm font-medium">
                      Notes (Optional)
                    </Label>
                    <Input
                      id="edit-notes"
                      value={editingTransaction.notes || ""}
                      onChange={(e) => setEditingTransaction({
                        ...editingTransaction,
                        notes: e.target.value
                      })}
                      placeholder="Add any additional notes..."
                      className="h-11"
                    />
                  </div>

                  {/* Tax Deductible */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                    <Checkbox
                      id="edit-tax"
                      checked={editingTransaction.isTaxDeductible || false}
                      onCheckedChange={(checked) => setEditingTransaction({
                        ...editingTransaction,
                        isTaxDeductible: checked as boolean
                      })}
                    />
                    <div className="flex-1">
                      <Label htmlFor="edit-tax" className="text-sm font-medium cursor-pointer">
                        Tax Deductible
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Mark if eligible for LHDN tax relief
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditSheetOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <LoadingSpinner size="xs" variant="minimal" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
