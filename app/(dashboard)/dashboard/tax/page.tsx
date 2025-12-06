"use client";

import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  FileText, Plus, Receipt, Calculator, TrendingUp, Upload, Trash2, 
  CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, PieChart, BarChart3, 
  FileCheck, Camera, Image, X, Eye, Download, DollarSign, Target, Clock,
  TrendingDown, Wallet, CalendarDays, Users, Loader2
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

// Types
interface TaxDeduction {
  id: string;
  category: string;
  lhdnCategory: string;
  description: string;
  amount: string;
  dateIncurred: string;
  year: number;
  month?: number;
  receiptUrl?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  receiptThumbnailUrl?: string;
  verified: boolean;
  forSelf?: boolean;
  forSpouse?: boolean;
  forChild?: boolean;
  forParent?: boolean;
}

interface CategoryBreakdown {
  code: string;
  name: string;
  nameMs?: string;
  reliefType: string;
  limit: number | null;
  userTotal: number;
  claimable: number;
  remaining: number | null;
  percentage: number;
  itemCount: number;
}

interface TaxCalculation {
  year: number;
  income: {
    gross: number;
    projected: number;
    fromTransactions: number;
    fromProfile: number;
  };
  deductions: {
    totalReliefs: number;
    totalDeductions: number;
    totalRebates: number;
    totalClaimable: number;
  };
  tax: {
    chargeableIncome: number;
    grossTax: number;
    rebates: number;
    netTaxPayable: number;
    effectiveRate: number;
  };
  pcb: {
    totalPaid: number;
    monthsRecorded: number;
  };
  result: {
    refund: number;
    owed: number;
    status: "refund" | "owed" | "balanced";
  };
  categories: CategoryBreakdown[];
}

// LHDN Categories with codes
const LHDN_CATEGORIES = [
  { code: "SELF_DEPENDENTS", name: "Individual & Dependent Relatives", limit: 9000 },
  { code: "SPOUSE", name: "Husband/Wife/Alimony", limit: 4000 },
  { code: "MEDICAL_EXPENSES", name: "Medical Expenses", limit: 10000 },
  { code: "MEDICAL_PARENTS", name: "Medical Treatment for Parents", limit: 10000 },
  { code: "EDUCATION_SELF", name: "Education Fees (Self)", limit: 7000 },
  { code: "EPF_LIFE_INSURANCE", name: "EPF & Life Insurance", limit: 7000 },
  { code: "PRS_ANNUITY", name: "Private Retirement Scheme (PRS)", limit: 3000 },
  { code: "EDUCATION_MEDICAL_INSURANCE", name: "Education & Medical Insurance", limit: 3000 },
  { code: "LIFESTYLE", name: "Lifestyle Expenses", limit: 2500 },
  { code: "ELECTRONICS_SPECIAL", name: "Electronics (Special)", limit: 2500 },
  { code: "SPORTS_ADDITIONAL", name: "Additional Sports Relief", limit: 500 },
  { code: "EV_CHARGING", name: "EV Charging Facilities", limit: 2500 },
  { code: "SOCSO", name: "SOCSO Contributions", limit: 350 },
  { code: "SSPN", name: "SSPN (Education Savings)", limit: 8000 },
  { code: "CHILDCARE", name: "Childcare Fees", limit: 3000 },
  { code: "BREASTFEEDING", name: "Breastfeeding Equipment", limit: 1000 },
  { code: "CHILD_UNDER_18", name: "Child Relief (Under 18)", limit: 2000 },
  { code: "CHILD_HIGHER_ED", name: "Child (18+) in Education", limit: 8000 },
  { code: "DISABLED_SELF", name: "Disabled Individual", limit: 6000 },
  { code: "DISABLED_EQUIPMENT", name: "Disabled Supporting Equipment", limit: 6000 },
  { code: "ZAKAT", name: "Zakat/Fitrah", limit: null },
  { code: "DONATIONS_APPROVED", name: "Donations to Approved Institutions", limit: null },
];

async function fetchTaxCalculation(year: number) {
  const res = await fetch(`/api/tax-calculator?year=${year}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTaxDeductions(year: number) {
  const res = await fetch(`/api/tax-deductions?year=${year}&includeTransactions=true`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function createDeduction(data: any) {
  const res = await fetch("/api/tax-deductions", {
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function deleteDeduction(id: string) {
  const res = await fetch(`/api/tax-deductions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

async function uploadReceipt(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "receipt");
  
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload");
  return res.json();
}

// Receipt Upload Component
function ReceiptUploader({ 
  onUpload, 
  currentFile,
  onRemove 
}: { 
  onUpload: (file: File) => void; 
  currentFile?: { url: string; name: string; thumbnail?: string };
  onRemove?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  if (currentFile) {
    return (
      <div className="relative rounded-lg border-2 border-dashed border-border p-4">
        <div className="flex items-center gap-4">
          {currentFile.thumbnail ? (
            <img src={currentFile.thumbnail} alt="Receipt" className="w-16 h-16 object-cover rounded-lg" />
          ) : (
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{currentFile.name}</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" asChild>
                <a href={currentFile.url} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-3 h-3 mr-1" /> View
                </a>
              </Button>
              {onRemove && (
                <Button variant="ghost" size="sm" onClick={onRemove}>
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      } p-6`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag & drop or click to upload receipt (JPG, PNG, PDF - max 10MB)
        </p>
      </div>
    </div>
  );
}

export default function TaxPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [annualIncome, setAnnualIncome] = useState(72000);
  const [uploadedReceipt, setUploadedReceipt] = useState<any>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isPcbDialogOpen, setIsPcbDialogOpen] = useState(false);
  const [selectedPcbMonth, setSelectedPcbMonth] = useState<number | null>(null);
  
  const [pcbFormData, setPcbFormData] = useState({
    grossSalary: "",
    bonus: "",
    allowances: "",
    commission: "",
    totalIncome: "",
    epfEmployee: "",
    socso: "",
    eis: "",
    zakat: "",
    pcbAmount: "",
    notes: "",
  });

  const [formData, setFormData] = useState({
    category: "", 
    lhdnCategory: "", 
    description: "", 
    amount: "",
    dateIncurred: new Date().toISOString().split("T")[0], 
    receiptUrl: "",
    forSelf: true,
    forSpouse: false,
    forChild: false,
    forParent: false,
  });

  // Fetch tax calculation data
  const { data: taxCalcData, isLoading: isLoadingCalc } = useQuery({
    queryKey: ["tax-calculator", selectedYear],
    queryFn: () => fetchTaxCalculation(selectedYear),
    enabled: isAuthenticated,
  });

  // Fetch tax deductions
  const { data: taxDeductionsData, isLoading: isLoadingDeductions } = useQuery({
    queryKey: ["tax-deductions", selectedYear],
    queryFn: () => fetchTaxDeductions(selectedYear),
    enabled: isAuthenticated,
  });

  // Fetch PCB records
  const { data: pcbData, isLoading: isLoadingPcb } = useQuery({
    queryKey: ["pcb-records", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/pcb?year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // PCB mutation
  const pcbMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pcb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcb-records"] });
      queryClient.invalidateQueries({ queryKey: ["tax-calculator"] });
      setIsPcbDialogOpen(false);
      resetPcbForm();
    },
  });

  const createMutation = useMutation({
    mutationFn: createDeduction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tax-deductions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-calculator"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Tax Deduction Added", {
        description: `RM ${parseFloat(variables.amount).toLocaleString()} deduction for ${variables.lhdnCategory} recorded.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add tax deduction", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-deductions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-calculator"] });
      setDeleteId(null);
      toast.success("Deduction Deleted", {
        description: "Tax deduction has been removed.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete deduction", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "", 
      lhdnCategory: "", 
      description: "", 
      amount: "",
      dateIncurred: new Date().toISOString().split("T")[0], 
      receiptUrl: "",
      forSelf: true,
      forSpouse: false,
      forChild: false,
      forParent: false,
    });
    setUploadedReceipt(null);
  };

  const resetPcbForm = () => {
    setPcbFormData({
      grossSalary: "",
      bonus: "",
      allowances: "",
      commission: "",
      totalIncome: "",
      epfEmployee: "",
      socso: "",
      eis: "",
      zakat: "",
      pcbAmount: "",
      notes: "",
    });
    setSelectedPcbMonth(null);
  };

  const handlePcbMonthClick = (month: number) => {
    setSelectedPcbMonth(month);
    // Load existing data if available
    const existingRecord = pcbData?.recordsByMonth?.[month];
    if (existingRecord) {
      setPcbFormData({
        grossSalary: existingRecord.grossSalary || "",
        bonus: existingRecord.bonus || "",
        allowances: existingRecord.allowances || "",
        commission: existingRecord.commission || "",
        totalIncome: existingRecord.totalIncome || "",
        epfEmployee: existingRecord.epfEmployee || "",
        socso: existingRecord.socso || "",
        eis: existingRecord.eis || "",
        zakat: existingRecord.zakat || "",
        pcbAmount: existingRecord.pcbAmount || "",
        notes: existingRecord.notes || "",
      });
    } else {
      resetPcbForm();
      setSelectedPcbMonth(month);
    }
    setIsPcbDialogOpen(true);
  };

  const handlePcbSubmit = () => {
    if (!selectedPcbMonth) return;
    pcbMutation.mutate({
      year: selectedYear,
      month: selectedPcbMonth,
      ...pcbFormData,
    });
  };

  const handleReceiptUpload = async (file: File) => {
    setIsUploadingReceipt(true);
    try {
      const result = await uploadReceipt(file);
      if (result.success) {
        setUploadedReceipt(result.data);
        setFormData(prev => ({
          ...prev,
          receiptUrl: result.data.fileUrl,
        }));
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      year: selectedYear,
      month: new Date(formData.dateIncurred).getMonth() + 1,
      receiptFileId: uploadedReceipt?.fileId,
      receiptFileName: uploadedReceipt?.fileName,
      receiptThumbnailUrl: uploadedReceipt?.thumbnailUrl,
    };
    createMutation.mutate(submitData);
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-MY", { 
      style: "currency", 
      currency: "MYR", 
      minimumFractionDigits: 0 
    }).format(amount);

  const isLoading = isLoadingCalc || isLoadingDeductions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading tax data..." />
      </div>
    );
  }

  const taxData = taxCalcData?.data;
  const deductions = taxDeductionsData?.data || [];
  const categories = taxData?.categories || [];
  
  // Calculate totals
  const totalClaimable = taxData?.deductions?.totalClaimable || 0;
  const taxSavings = (taxData?.tax?.grossTax || 0) - (taxData?.tax?.netTaxPayable || 0);
  const refundOrOwed = taxData?.result || { refund: 0, owed: 0, status: "balanced" };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight">Tax Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            LHDN Year of Assessment {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedYear(y => y - 1)} 
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-4 font-semibold">{selectedYear}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))} 
              disabled={selectedYear >= currentYear} 
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Deduction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Add Tax Deduction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>LHDN Relief Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => {
                      const cat = LHDN_CATEGORIES.find(c => c.code === v);
                      setFormData({ 
                        ...formData, 
                        category: v, 
                        lhdnCategory: cat?.name || v 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {LHDN_CATEGORIES.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cat.name}</span>
                            {cat.limit && (
                              <span className="text-xs text-muted-foreground ml-2">
                                Max: {formatCurrency(cat.limit)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input 
                    placeholder="e.g., Medical checkup at Sunway Medical" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>

                {/* Amount and Date */}
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
                    <Label>Date *</Label>
                    <Input 
                      type="date" 
                      value={formData.dateIncurred} 
                      onChange={(e) => setFormData({ ...formData, dateIncurred: e.target.value })} 
                    />
                  </div>
                </div>

                {/* For Whom */}
                <div className="space-y-2">
                  <Label>Claim For</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "forSelf", label: "Self" },
                      { key: "forSpouse", label: "Spouse" },
                      { key: "forChild", label: "Child" },
                      { key: "forParent", label: "Parent" },
                    ].map(({ key, label }) => (
                      <Button
                        key={key}
                        type="button"
                        variant={formData[key as keyof typeof formData] ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ 
                          ...formData, 
                          [key]: !formData[key as keyof typeof formData] 
                        })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                  <Label>Receipt / Invoice</Label>
                  {isUploadingReceipt ? (
                    <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <ReceiptUploader
                      onUpload={handleReceiptUpload}
                      currentFile={uploadedReceipt ? {
                        url: uploadedReceipt.fileUrl,
                        name: uploadedReceipt.fileName,
                        thumbnail: uploadedReceipt.thumbnailUrl,
                      } : undefined}
                      onRemove={() => {
                        setUploadedReceipt(null);
                        setFormData(prev => ({ ...prev, receiptUrl: "" }));
                      }}
                    />
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  className="w-full" 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || !formData.category || !formData.amount || !formData.description}
                >
                  {createMutation.isPending ? (
                    <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
                  ) : null}
                  Add Deduction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tax Refund/Owed Status Card */}
      {refundOrOwed.status !== "balanced" && (
        <Card className={`data-card p-6 border-2 ${
          refundOrOwed.status === "refund" 
            ? "border-emerald-500/30 bg-emerald-500/5" 
            : "border-amber-500/30 bg-amber-500/5"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {refundOrOwed.status === "refund" ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-emerald-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-500" />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  {refundOrOwed.status === "refund" ? "Estimated Tax Refund" : "Estimated Tax Payable"}
                </p>
                <p className={`font-display font-bold text-3xl ${
                  refundOrOwed.status === "refund" ? "text-emerald-500" : "text-amber-500"
                }`}>
                  {formatCurrency(refundOrOwed.status === "refund" ? refundOrOwed.refund : refundOrOwed.owed)}
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>PCB Paid: {formatCurrency(taxData?.pcb?.totalPaid || 0)}</p>
              <p>Tax Payable: {formatCurrency(taxData?.tax?.netTaxPayable || 0)}</p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="w-4 h-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="w-4 h-4" />Tax Calculator
          </TabsTrigger>
          <TabsTrigger value="bookkeeping" className="gap-2">
            <FileCheck className="w-4 h-4" />Bookkeeping
          </TabsTrigger>
          <TabsTrigger value="pcb" className="gap-2">
            <CalendarDays className="w-4 h-4" />Monthly PCB
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="data-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total Deductions
                </div>
              </div>
              <div className="font-display font-bold text-3xl text-primary">
                {formatCurrency(totalClaimable)}
              </div>
            </Card>
            
            <Card className="data-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tax Savings
                </div>
              </div>
              <div className="font-display font-bold text-3xl text-emerald-500">
                {formatCurrency(taxSavings)}
              </div>
            </Card>
            
            <Card className="data-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Deduction Items
                </div>
              </div>
              <div className="font-display font-bold text-3xl">
                {deductions.length}
              </div>
            </Card>
            
            <Card className="data-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-violet-500" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Categories Used
                </div>
              </div>
              <div className="font-display font-bold text-3xl">
                {categories.filter((c: CategoryBreakdown) => c.userTotal > 0).length}
              </div>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">LHDN Relief Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories
                .filter((cat: CategoryBreakdown) => cat.limit !== null)
                .map((cat: CategoryBreakdown) => (
                  <div 
                    key={cat.code} 
                    className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Limit: {formatCurrency(cat.limit!)}
                          {cat.itemCount > 0 && ` • ${cat.itemCount} item${cat.itemCount > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-xl">
                          {formatCurrency(cat.claimable)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cat.remaining !== null ? `${formatCurrency(cat.remaining)} left` : ""}
                        </p>
                      </div>
                    </div>
                    <Progress value={Math.min(cat.percentage, 100)} className="h-2" />
                    {cat.percentage > 100 && (
                      <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeded limit - only {formatCurrency(cat.limit!)} claimable
                      </p>
                    )}
                  </div>
                ))}
              
              {categories.filter((c: CategoryBreakdown) => c.limit !== null).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No categories with limits found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card className="data-card p-6">
            <h3 className="font-semibold text-lg mb-4">Tax Calculator (YA {selectedYear})</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Annual Chargeable Income (MYR)</Label>
                  <Input 
                    type="number" 
                    value={annualIncome} 
                    onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)} 
                    className="text-lg font-mono" 
                  />
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm text-muted-foreground">Total Relief Claimed</p>
                  <p className="font-display font-bold text-2xl text-primary">
                    {formatCurrency(totalClaimable)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm text-muted-foreground">Chargeable Income</p>
                  <p className="font-display font-bold text-2xl">
                    {formatCurrency(Math.max(0, annualIncome - totalClaimable))}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                  <p className="text-sm text-muted-foreground mb-1">Tax Without Relief</p>
                  <p className="font-display font-bold text-2xl text-red-500">
                    {formatCurrency(taxData?.tax?.grossTax || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-sm text-muted-foreground mb-1">Tax With Relief</p>
                  <p className="font-display font-bold text-2xl text-emerald-500">
                    {formatCurrency(taxData?.tax?.netTaxPayable || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-1">You Save</p>
                  <p className="font-display font-bold text-3xl text-primary">
                    {formatCurrency(taxSavings)}
                  </p>
                </div>
                {taxData?.tax?.effectiveRate && (
                  <p className="text-sm text-muted-foreground text-center">
                    Effective Tax Rate: {taxData.tax.effectiveRate.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Bookkeeping Tab */}
        <TabsContent value="bookkeeping" className="space-y-6">
          <Card className="data-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tax Deduction Records</CardTitle>
              <Badge variant="outline">{deductions.length} items</Badge>
            </CardHeader>
            <CardContent>
              {deductions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No deductions recorded yet</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Deduction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deductions.map((d: TaxDeduction) => (
                    <div 
                      key={d.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          d.verified ? "bg-emerald-500/10" : "bg-muted"
                        }`}>
                          {d.receiptUrl ? (
                            <Image className="w-5 h-5 text-primary" />
                          ) : d.verified ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Receipt className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{d.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{d.lhdnCategory}</span>
                            <span>•</span>
                            <span>{new Date(d.dateIncurred).toLocaleDateString("en-MY")}</span>
                            {d.receiptUrl && (
                              <>
                                <span>•</span>
                                <a 
                                  href={d.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View Receipt
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-display font-semibold text-lg">
                          {formatCurrency(parseFloat(d.amount))}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100" 
                          onClick={() => setDeleteId(d.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly PCB Tab */}
        <TabsContent value="pcb" className="space-y-6">
          <Card className="data-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Monthly PCB Records</h3>
                <p className="text-sm text-muted-foreground">Track your Potongan Cukai Bulanan (Monthly Tax Deduction)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total PCB Paid</p>
                <p className="font-display font-bold text-2xl">{formatCurrency(pcbData?.totals?.totalPcb || 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Months Recorded</p>
                <p className="font-display font-bold text-2xl">{pcbData?.monthsRecorded || 0}/12</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Monthly PCB</p>
                <p className="font-display font-bold text-2xl">
                  {formatCurrency((pcbData?.totals?.totalPcb || 0) / Math.max(1, pcbData?.monthsRecorded || 1))}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total EPF</p>
                <p className="font-display font-bold text-2xl">{formatCurrency(pcbData?.totals?.totalEpf || 0)}</p>
              </div>
            </div>

            {/* Monthly Grid - Clickable */}
            <p className="text-sm text-muted-foreground mb-3">Click on a month to add or edit PCB record</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthName = new Date(selectedYear, i, 1).toLocaleDateString("en-MY", { month: "short" });
                const isPast = selectedYear < currentYear || (selectedYear === currentYear && month <= new Date().getMonth() + 1);
                const record = pcbData?.recordsByMonth?.[month];
                const hasRecord = !!record;
                
                return (
                  <div
                    key={month}
                    onClick={() => handlePcbMonthClick(month)}
                    className={`p-4 rounded-lg border text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                      hasRecord 
                        ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500" 
                        : isPast 
                          ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500" 
                          : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{monthName}</p>
                    <p className="text-xs text-muted-foreground">{selectedYear}</p>
                    {hasRecord ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mt-2" />
                        <p className="text-xs font-semibold text-emerald-500 mt-1">
                          {formatCurrency(parseFloat(record.pcbAmount || "0"))}
                        </p>
                      </>
                    ) : isPast ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mt-2" />
                        <p className="text-xs text-amber-500 mt-1">Missing</p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-muted-foreground mx-auto mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deduction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tax deduction record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90" 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PCB Record Dialog */}
      <Dialog open={isPcbDialogOpen} onOpenChange={(open) => { setIsPcbDialogOpen(open); if (!open) resetPcbForm(); }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedPcbMonth ? `${new Date(selectedYear, selectedPcbMonth - 1).toLocaleDateString("en-MY", { month: "long" })} ${selectedYear}` : "PCB Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Income Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Gross Salary</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.grossSalary}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, grossSalary: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bonus</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.bonus}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, bonus: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Allowances</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.allowances}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, allowances: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commission</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.commission}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, commission: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deductions</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">EPF (Employee)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.epfEmployee}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, epfEmployee: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SOCSO</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.socso}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, socso: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">EIS</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.eis}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, eis: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zakat</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={pcbFormData.zakat}
                    onChange={(e) => setPcbFormData({ ...pcbFormData, zakat: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* PCB Amount */}
            <div className="space-y-2">
              <Label>PCB Amount (Monthly Tax Deduction) *</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={pcbFormData.pcbAmount}
                onChange={(e) => setPcbFormData({ ...pcbFormData, pcbAmount: e.target.value })}
                className="text-lg font-semibold"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                placeholder="Any additional notes..."
                value={pcbFormData.notes}
                onChange={(e) => setPcbFormData({ ...pcbFormData, notes: e.target.value })}
              />
            </div>

            {/* Submit */}
            <Button 
              className="w-full" 
              onClick={handlePcbSubmit}
              disabled={pcbMutation.isPending || !pcbFormData.pcbAmount}
            >
              {pcbMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save PCB Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
