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
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { motion } from "framer-motion";
import { 
  FileText, Plus, Receipt, Calculator, TrendingUp, Upload, Trash2, 
  CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, PieChart, BarChart3, 
  FileCheck, Camera, Image, X, Eye, DollarSign, Target, Clock,
  TrendingDown, Wallet, CalendarDays, Loader2, Sparkles, Shield, Building2,
  ArrowUpRight, ArrowDownRight, Banknote, BadgePercent, FileStack, Landmark
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const totalReliefs = taxData?.deductions?.totalReliefs || 0;
  const grossIncome = taxData?.income?.gross || 0;
  const chargeableIncome = taxData?.tax?.chargeableIncome || 0;
  const grossTax = taxData?.tax?.grossTax || 0;
  const netTaxPayable = taxData?.tax?.netTaxPayable || 0;
  const taxSavings = grossTax - netTaxPayable;
  const effectiveRate = taxData?.tax?.effectiveRate || 0;
  const totalPcbPaid = taxData?.pcb?.totalPaid || 0;
  const refundOrOwed = taxData?.result || { refund: 0, owed: 0, status: "balanced" };
  const categoriesUsed = categories.filter((c: CategoryBreakdown) => c.userTotal > 0).length;
  const totalCategories = categories.length;

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-pink-600/10 border border-violet-500/20 p-4 md:p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-violet-500/20">
                <Landmark className="w-6 h-6 text-violet-400" />
              </div>
              <Badge variant="outline" className="border-violet-500/30 text-violet-400 bg-violet-500/10">
                LHDN YA {selectedYear}
              </Badge>
            </div>
            <h1 className="font-display font-bold text-2xl md:text-4xl tracking-tight mb-2">
              Tax Management
            </h1>
            <p className="text-muted-foreground max-w-md">
              Track deductions, calculate taxes, and maximize your reliefs for Year of Assessment {selectedYear}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center bg-background/50 backdrop-blur-sm rounded-xl border border-white/10 p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedYear(y => y - 1)} 
                className="h-10 w-10 p-0 hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-6 py-2 text-center min-w-[100px]">
                <p className="text-xs text-muted-foreground">Year</p>
                <p className="font-bold text-lg">{selectedYear}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))} 
                disabled={selectedYear >= currentYear} 
                className="h-10 w-10 p-0 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25">
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
      </div>

      {/* Tax Status Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={cn(
          "relative overflow-hidden border-2 p-6",
          refundOrOwed.status === "refund" 
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" 
            : refundOrOwed.status === "owed"
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent"
            : "border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent"
        )}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl" />
          
          <div className="relative z-10 grid md:grid-cols-3 gap-6">
            {/* Main Status */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  refundOrOwed.status === "refund" ? "bg-emerald-500/20" : refundOrOwed.status === "owed" ? "bg-amber-500/20" : "bg-blue-500/20"
                )}>
                  {refundOrOwed.status === "refund" ? (
                    <ArrowDownRight className="w-7 h-7 text-emerald-500" />
                  ) : refundOrOwed.status === "owed" ? (
                    <ArrowUpRight className="w-7 h-7 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {refundOrOwed.status === "refund" ? "Estimated Refund" : refundOrOwed.status === "owed" ? "Estimated Tax Due" : "Tax Status"}
                  </p>
                  <p className={cn(
                    "font-display font-bold text-3xl",
                    refundOrOwed.status === "refund" ? "text-emerald-500" : refundOrOwed.status === "owed" ? "text-amber-500" : "text-blue-500"
                  )}>
                    {refundOrOwed.status === "balanced" ? "Balanced" : formatCurrency(refundOrOwed.status === "refund" ? refundOrOwed.refund : refundOrOwed.owed)}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground mb-1">Gross Income</p>
                <p className="font-bold text-lg">{formatCurrency(grossIncome)}</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground mb-1">PCB Paid (YTD)</p>
                <p className="font-bold text-lg">{formatCurrency(totalPcbPaid)}</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground mb-1">Net Tax Payable</p>
                <p className="font-bold text-lg">{formatCurrency(netTaxPayable)}</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-xs text-muted-foreground mb-1">Effective Rate</p>
                <p className="font-bold text-lg">{effectiveRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Deductions</p>
                <p className="font-display font-bold text-2xl md:text-3xl mt-2 text-violet-400">
                  {formatCurrency(totalClaimable)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{deductions.length} items recorded</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Receipt className="w-5 h-5 text-violet-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Savings</p>
                <p className="font-display font-bold text-2xl md:text-3xl mt-2 text-emerald-400">
                  {formatCurrency(Math.max(0, taxSavings))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">From claimed reliefs</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories Used</p>
                <p className="font-display font-bold text-2xl md:text-3xl mt-2">
                  <span className="text-blue-400">{categoriesUsed}</span>
                  <span className="text-muted-foreground text-lg">/{totalCategories}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Relief categories</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chargeable Income</p>
                <p className="font-display font-bold text-2xl md:text-3xl mt-2">
                  {formatCurrency(chargeableIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">After reliefs</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Banknote className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="bg-muted/30 backdrop-blur-sm p-1 rounded-xl border border-white/5 flex-wrap h-auto">
          <TabsTrigger value="categories" className="gap-2 rounded-lg data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
            <PieChart className="w-4 h-4" />Relief Categories
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2 rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Calculator className="w-4 h-4" />Tax Calculator
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 rounded-lg data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            <FileStack className="w-4 h-4" />Deduction Records
          </TabsTrigger>
          <TabsTrigger value="pcb" className="gap-2 rounded-lg data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            <CalendarDays className="w-4 h-4" />Monthly PCB
          </TabsTrigger>
        </TabsList>

        {/* Relief Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">LHDN Relief Categories</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Track your tax relief claims against LHDN limits</p>
                </div>
                <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                  {categoriesUsed} of {totalCategories} used
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
              {/* Categories with activity first, then empty ones */}
              {[...categories]
                .sort((a: CategoryBreakdown, b: CategoryBreakdown) => (b.userTotal || 0) - (a.userTotal || 0))
                .filter((cat: CategoryBreakdown) => cat.limit !== null)
                .map((cat: CategoryBreakdown, index: number) => {
                  const hasActivity = cat.userTotal > 0;
                  const isMaxed = cat.percentage >= 100;
                  
                  return (
                    <motion.div
                      key={cat.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 group",
                        hasActivity 
                          ? "bg-gradient-to-r from-violet-500/5 to-transparent border-violet-500/20 hover:border-violet-500/40" 
                          : "bg-card/50 border-border/50 hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            hasActivity ? "bg-violet-500/20" : "bg-muted"
                          )}>
                            {isMaxed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : hasActivity ? (
                              <BadgePercent className="w-5 h-5 text-violet-400" />
                            ) : (
                              <Target className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className={cn(
                              "font-semibold",
                              hasActivity ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {cat.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Max: {formatCurrency(cat.limit!)}</span>
                              {cat.itemCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{cat.itemCount} item{cat.itemCount > 1 ? "s" : ""}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-display font-bold text-xl",
                            hasActivity ? (isMaxed ? "text-emerald-400" : "text-violet-400") : "text-muted-foreground"
                          )}>
                            {formatCurrency(cat.claimable)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cat.remaining !== null && cat.remaining > 0 
                              ? `${formatCurrency(cat.remaining)} remaining` 
                              : isMaxed 
                              ? "Limit reached" 
                              : "Not claimed"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.03 }}
                            className={cn(
                              "h-full rounded-full",
                              isMaxed 
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                                : hasActivity 
                                ? "bg-gradient-to-r from-violet-500 to-purple-400" 
                                : "bg-muted-foreground/20"
                            )}
                          />
                        </div>
                        <span className="absolute right-0 top-3 text-xs text-muted-foreground">
                          {cat.percentage.toFixed(0)}%
                        </span>
                      </div>

                      {cat.percentage > 100 && (
                        <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Exceeded limit by {formatCurrency(cat.userTotal - (cat.limit || 0))} - only {formatCurrency(cat.limit!)} claimable
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              
              {categories.filter((c: CategoryBreakdown) => c.limit !== null).length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No relief categories available</p>
                  <p className="text-sm">Categories will appear once configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                Tax Calculator YA {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Annual Gross Income (MYR)</Label>
                    <Input 
                      type="number" 
                      value={annualIncome} 
                      onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)} 
                      className="text-lg font-mono h-12 bg-background/50" 
                    />
                  </div>
                  <div className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-2">
                    <p className="text-sm text-muted-foreground">Total Relief Claimed</p>
                    <p className="font-display font-bold text-3xl text-violet-400">
                      {formatCurrency(totalClaimable)}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-background/50 border border-border space-y-2">
                    <p className="text-sm text-muted-foreground">Chargeable Income</p>
                    <p className="font-display font-bold text-3xl">
                      {formatCurrency(Math.max(0, annualIncome - totalClaimable))}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-muted-foreground">Tax Without Relief</p>
                    </div>
                    <p className="font-display font-bold text-3xl text-red-400">
                      {formatCurrency(grossTax)}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm text-muted-foreground">Tax With Relief</p>
                    </div>
                    <p className="font-display font-bold text-3xl text-emerald-400">
                      {formatCurrency(netTaxPayable)}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-400">Total Tax Savings</p>
                    </div>
                    <p className="font-display font-bold text-4xl text-emerald-400">
                      {formatCurrency(Math.max(0, taxSavings))}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Effective Tax Rate: <span className="font-semibold text-foreground">{effectiveRate.toFixed(2)}%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deduction Records Tab */}
        <TabsContent value="records" className="space-y-6">
          <Card className="border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileStack className="w-5 h-5 text-blue-400" />
                  Tax Deduction Records
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">All your recorded tax deductions for YA {selectedYear}</p>
              </div>
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                {deductions.length} items
              </Badge>
            </CardHeader>
            <CardContent>
              {deductions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-blue-400/50" />
                  </div>
                  <p className="text-lg font-medium mb-2">No deductions recorded yet</p>
                  <p className="text-sm text-muted-foreground mb-6">Start tracking your tax-deductible expenses</p>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Deduction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deductions.map((d: TaxDeduction, index: number) => (
                    <motion.div 
                      key={d.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card/50 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          d.verified ? "bg-emerald-500/10" : "bg-blue-500/10"
                        )}>
                          {d.receiptUrl ? (
                            <Image className="w-5 h-5 text-blue-400" />
                          ) : d.verified ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Receipt className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{d.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs py-0 h-5">
                              {d.lhdnCategory || d.category}
                            </Badge>
                            <span>•</span>
                            <span>{new Date(d.dateIncurred).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</span>
                            {d.receiptUrl && (
                              <>
                                <span>•</span>
                                <a 
                                  href={d.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Receipt
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-display font-bold text-xl text-blue-400">
                          {formatCurrency(parseFloat(d.amount))}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10" 
                          onClick={() => setDeleteId(d.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly PCB Tab */}
        <TabsContent value="pcb" className="space-y-6">
          <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-orange-400" />
                    Monthly PCB Records
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Track your Potongan Cukai Bulanan (Monthly Tax Deduction)</p>
                </div>
                <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                  {pcbData?.monthsRecorded || 0}/12 months
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6">
              {/* PCB Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total PCB Paid</p>
                  <p className="font-display font-bold text-2xl text-orange-400">{formatCurrency(pcbData?.totals?.totalPcb || 0)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Months Recorded</p>
                  <p className="font-display font-bold text-2xl">
                    <span className="text-orange-400">{pcbData?.monthsRecorded || 0}</span>
                    <span className="text-muted-foreground">/12</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Avg Monthly PCB</p>
                  <p className="font-display font-bold text-2xl">
                    {formatCurrency((pcbData?.totals?.totalPcb || 0) / Math.max(1, pcbData?.monthsRecorded || 1))}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total EPF</p>
                  <p className="font-display font-bold text-2xl text-violet-400">{formatCurrency(pcbData?.totals?.totalEpf || 0)}</p>
                </div>
              </div>

              {/* Monthly Grid - Clickable */}
              <div>
                <p className="text-sm text-muted-foreground mb-4">Click on a month to add or edit PCB record</p>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(selectedYear, i, 1).toLocaleDateString("en-MY", { month: "short" });
                    const monthFull = new Date(selectedYear, i, 1).toLocaleDateString("en-MY", { month: "long" });
                    const isPast = selectedYear < currentYear || (selectedYear === currentYear && month <= new Date().getMonth() + 1);
                    const record = pcbData?.recordsByMonth?.[month];
                    const hasRecord = !!record;
                    
                    return (
                      <motion.div
                        key={month}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => handlePcbMonthClick(month)}
                        className={cn(
                          "p-4 rounded-2xl border text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
                          hasRecord 
                            ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500" 
                            : isPast 
                            ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-500/5 hover:border-amber-500" 
                            : "border-border bg-card/50 hover:border-orange-500/50"
                        )}
                      >
                        <p className="text-sm font-semibold">{monthName}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedYear}</p>
                        {hasRecord ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mt-2" />
                            <p className="text-xs font-bold text-emerald-400 mt-1">
                              {formatCurrency(parseFloat(record.pcbAmount || "0"))}
                            </p>
                          </>
                        ) : isPast ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mt-2" />
                            <p className="text-xs text-amber-400 mt-1">Missing</p>
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5 text-muted-foreground mx-auto mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
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
