"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, DollarSign, TrendingUp, Briefcase, Gift, Laptop, LineChart, Plus, ChevronLeft, ChevronRight, Check, X, Pencil } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { MonthlySalaryChart } from "@/components/charts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IncomeSummaryData {
  year: number;
  summary: { totalYearlyIncome: number; avgMonthlyIncome: number; totalSalary: number; totalBonus: number; totalFreelance: number; totalInvestment: number; totalCommission: number; totalOther: number; monthsWithIncome: number; monthsWithSalary: number; avgMonthlySalary: number; };
  incomeTypeTotals: { salary: number; bonus: number; freelance: number; investment: number; commission: number; other: number; };
  monthlyBreakdown: Array<{ month: number; monthName: string; salary: number; bonus: number; freelance: number; investment: number; commission: number; other: number; total: number; transactions: Array<{ id: string; amount: number; incomeType: string; description: string | null; date: Date; }>; }>;
  recentTransactions: Array<{ id: string; amount: number; incomeType: string; incomeMonth: number | null; incomeYear: number | null; description: string | null; date: Date; }>;
}

const INCOME_TYPES = [
  { key: "salary", icon: Briefcase, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Salary" },
  { key: "bonus", icon: Gift, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "Bonus" },
  { key: "freelance", icon: Laptop, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "Freelance" },
  { key: "investment", icon: LineChart, color: "text-emerald-500", bgColor: "bg-emerald-500/10", label: "Investment" },
  { key: "commission", icon: TrendingUp, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Commission" },
  { key: "other", icon: DollarSign, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "Other" },
];

async function fetchIncomeSummary(year: number): Promise<IncomeSummaryData> {
  const res = await fetch(`/api/income-summary?year=${year}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).data;
}

async function createIncomeTransaction(data: any) {
  const res = await fetch("/api/transactions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type: "income" }),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateTransaction(id: string, data: any) {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

export default function IncomeSummaryPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingCell, setEditingCell] = useState<{ month: number; type: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newIncome, setNewIncome] = useState({
    description: "", amount: "", incomeType: "salary",
    incomeMonth: currentMonth, incomeYear: currentYear,
    date: new Date().toISOString().split("T")[0],
  });

  const { data: incomeSummary, isLoading } = useQuery({
    queryKey: ["income-summary", selectedYear],
    queryFn: () => fetchIncomeSummary(selectedYear),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createIncomeTransaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsAddDialogOpen(false);
      setNewIncome({ description: "", amount: "", incomeType: "salary", incomeMonth: currentMonth, incomeYear: currentYear, date: new Date().toISOString().split("T")[0] });
      const incomeType = INCOME_TYPES.find(t => t.key === variables.incomeType)?.label || "Income";
      toast.success("Income Added", {
        description: `${incomeType} of RM ${parseFloat(variables.amount).toLocaleString()} recorded successfully.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add income", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTransaction(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setEditingCell(null);
      toast.success("Income Updated", {
        description: `Amount updated to RM ${parseFloat(variables.data.amount).toLocaleString()}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update income", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const handleCellClick = (month: number, type: string, currentValue: number) => {
    setEditingCell({ month, type });
    setEditValue(currentValue > 0 ? currentValue.toString() : "");
  };

  const handleSaveCell = async (month: number, type: string) => {
    const amount = parseFloat(editValue) || 0;
    if (amount <= 0) { setEditingCell(null); return; }

    const monthData = incomeSummary?.monthlyBreakdown[month - 1];
    const existingTx = monthData?.transactions.find(tx => tx.incomeType === type);

    if (existingTx) {
      updateMutation.mutate({ id: existingTx.id, data: { amount: amount.toString() } });
    } else {
      createMutation.mutate({
        description: `${INCOME_TYPES.find(t => t.key === type)?.label} - ${monthData?.monthName} ${selectedYear}`,
        amount: amount.toString(), incomeType: type,
        incomeMonth: month, incomeYear: selectedYear,
        date: new Date(selectedYear, month - 1, 15).toISOString(),
      });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading income data..." /></div>;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="font-display font-semibold text-3xl md:text-4xl tracking-tight">Income Summary</h1><p className="text-muted-foreground text-sm mt-1">Track and manage your income sources</p></div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={() => setSelectedYear(y => y - 1)} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="px-4 font-semibold">{selectedYear}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))} disabled={selectedYear >= currentYear} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Income</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Add Income</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Description</Label><Input placeholder="e.g., November Salary" value={newIncome.description} onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount (MYR)</Label><Input type="number" placeholder="0.00" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Income Type</Label>
                    <Select value={newIncome.incomeType} onValueChange={(v) => setNewIncome({ ...newIncome, incomeType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INCOME_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>For Month</Label>
                    <Select value={newIncome.incomeMonth.toString()} onValueChange={(v) => setNewIncome({ ...newIncome, incomeMonth: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{new Date(2024, i, 1).toLocaleString("default", { month: "long" })}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Year</Label>
                    <Select value={newIncome.incomeYear.toString()} onValueChange={(v) => setNewIncome({ ...newIncome, incomeYear: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => createMutation.mutate({ ...newIncome, date: new Date(newIncome.incomeYear, newIncome.incomeMonth - 1, 15).toISOString() })} disabled={createMutation.isPending || !newIncome.amount}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Add Income
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {incomeSummary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="data-card p-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Yearly</p><p className="text-2xl md:text-3xl font-display font-bold text-emerald-500 mt-2">{formatCurrency(incomeSummary.summary.totalYearlyIncome)}</p></Card>
            <Card className="data-card p-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg. Monthly</p><p className="text-2xl md:text-3xl font-display font-bold mt-2">{formatCurrency(incomeSummary.summary.avgMonthlyIncome)}</p></Card>
            <Card className="data-card p-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Salary</p><p className="text-2xl md:text-3xl font-display font-bold text-blue-500 mt-2">{formatCurrency(incomeSummary.summary.totalSalary)}</p></Card>
            <Card className="data-card p-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Bonus</p><p className="text-2xl md:text-3xl font-display font-bold text-purple-500 mt-2">{formatCurrency(incomeSummary.summary.totalBonus)}</p></Card>
          </div>

          {/* Income by Type */}
          <Card className="data-card"><CardHeader><CardTitle className="text-lg font-semibold">Income by Type</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {INCOME_TYPES.map(({ key, icon: Icon, color, bgColor, label }) => {
                const amount = incomeSummary.incomeTypeTotals[key as keyof typeof incomeSummary.incomeTypeTotals] || 0;
                const pct = incomeSummary.summary.totalYearlyIncome > 0 ? ((amount / incomeSummary.summary.totalYearlyIncome) * 100).toFixed(1) : "0";
                return (
                  <div key={key} className={`p-4 rounded-xl ${bgColor} border border-white/5`}>
                    <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${color}`} /><span className="text-xs font-medium text-muted-foreground">{label}</span></div>
                    <p className={`text-lg font-bold ${color}`}>{formatCurrency(amount)}</p><p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>

          {/* Monthly Chart */}
          <Card className="data-card"><CardHeader><CardTitle className="text-lg font-semibold">Monthly Income</CardTitle></CardHeader><CardContent><MonthlySalaryChart data={incomeSummary.monthlyBreakdown} avgMonthlySalary={incomeSummary.summary.avgMonthlySalary} /></CardContent></Card>

          {/* Editable Monthly Table */}
          <Card className="data-card"><CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2">Monthly Details <span className="text-xs font-normal text-muted-foreground">(Click cells to edit)</span></CardTitle></CardHeader><CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Month</th>
                  {INCOME_TYPES.slice(0, 5).map(t => <th key={t.key} className={`text-right py-3 px-4 font-semibold ${t.color}`}>{t.label}</th>)}
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr></thead>
                <tbody>
                  {incomeSummary.monthlyBreakdown.map((m) => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{m.monthName}</td>
                      {["salary", "bonus", "freelance", "investment", "commission"].map(type => {
                        const val = m[type as keyof typeof m] as number;
                        const isEditing = editingCell?.month === m.month && editingCell?.type === type;
                        return (
                          <td key={type} className="py-2 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-24 h-8 text-right" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveCell(m.month, type); if (e.key === "Escape") setEditingCell(null); }} />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveCell(m.month, type)}><Check className="w-4 h-4 text-emerald-500" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCell(null)}><X className="w-4 h-4" /></Button>
                              </div>
                            ) : (
                              <button onClick={() => handleCellClick(m.month, type, val)} className="font-mono hover:bg-primary/10 px-2 py-1 rounded transition-colors w-full text-right group">
                                {val > 0 ? formatCurrency(val) : <span className="text-muted-foreground/50 group-hover:text-primary">-</span>}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right font-mono font-bold">{m.total > 0 ? formatCurrency(m.total) : "-"}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-500">{formatCurrency(incomeSummary.incomeTypeTotals.salary)}</td>
                    <td className="py-3 px-4 text-right font-mono text-purple-500">{formatCurrency(incomeSummary.incomeTypeTotals.bonus)}</td>
                    <td className="py-3 px-4 text-right font-mono text-cyan-500">{formatCurrency(incomeSummary.incomeTypeTotals.freelance)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatCurrency(incomeSummary.incomeTypeTotals.investment)}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-500">{formatCurrency(incomeSummary.incomeTypeTotals.commission)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatCurrency(incomeSummary.summary.totalYearlyIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </>
      ) : (
        <Card className="data-card p-12 text-center"><DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" /><h3 className="text-lg font-semibold mb-2">No Income Data</h3><p className="text-muted-foreground mb-4">Start tracking your income.</p><Button onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Income</Button></Card>
      )}
    </div>
  );
}
