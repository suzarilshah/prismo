"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  Wallet,
  Calendar,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Clock,
  PiggyBank,
  BarChart3,
  LineChart,
  Activity,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Mock data for demonstration - will be replaced with API data
const generateMockForecastData = () => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const data = [];
  
  // Historical data (past 6 months)
  for (let i = 5; i >= 0; i--) {
    const month = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    data.push({
      month: `${MONTHS[month]} ${year}`,
      actual: Math.floor(Math.random() * 3000) + 4000,
      forecast: null,
      income: Math.floor(Math.random() * 2000) + 7000,
      isHistorical: true,
    });
  }
  
  // Current month
  data.push({
    month: `${MONTHS[currentMonth]} ${currentYear}`,
    actual: Math.floor(Math.random() * 2000) + 3000,
    forecast: Math.floor(Math.random() * 2000) + 5000,
    income: Math.floor(Math.random() * 2000) + 7000,
    isHistorical: false,
    isCurrent: true,
  });
  
  // Future forecasts (next 5 months)
  for (let i = 1; i <= 5; i++) {
    const month = (currentMonth + i) % 12;
    const year = currentMonth + i > 11 ? currentYear + 1 : currentYear;
    data.push({
      month: `${MONTHS[month]} ${year}`,
      actual: null,
      forecast: Math.floor(Math.random() * 2000) + 4500,
      income: Math.floor(Math.random() * 2000) + 7500,
      isHistorical: false,
    });
  }
  
  return data;
};

const generateCategoryForecasts = () => [
  { category: "Food & Dining", current: 1200, forecast: 1350, trend: "up", confidence: 85 },
  { category: "Transportation", current: 450, forecast: 420, trend: "down", confidence: 90 },
  { category: "Utilities", current: 380, forecast: 395, trend: "stable", confidence: 95 },
  { category: "Shopping", current: 800, forecast: 950, trend: "up", confidence: 70 },
  { category: "Entertainment", current: 300, forecast: 280, trend: "down", confidence: 80 },
  { category: "Healthcare", current: 150, forecast: 200, trend: "up", confidence: 65 },
];

export default function ForecastPage() {
  const { isAuthenticated } = useAuth();
  const [forecastPeriod, setForecastPeriod] = useState("6");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch forecast data (mocked for now)
  const { data: forecastData, isLoading, refetch } = useQuery({
    queryKey: ["spending-forecast", forecastPeriod],
    queryFn: async () => {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        chartData: generateMockForecastData(),
        categoryForecasts: generateCategoryForecasts(),
        summary: {
          predictedSpending: 5200,
          confidenceScore: 82,
          predictedSavings: 2300,
          savingsRate: 31,
          alerts: [
            { type: "warning", message: "Shopping expenses trending 18% higher than usual" },
            { type: "info", message: "You're on track to save RM 27,600 this year" },
            { type: "success", message: "Transportation costs down 7% from last month" },
          ],
        },
      };
    },
    enabled: isAuthenticated,
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-emerald-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Spending Forecast
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered predictions based on your spending patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Forecast period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Next 3 months</SelectItem>
              <SelectItem value="6">Next 6 months</SelectItem>
              <SelectItem value="12">Next 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(forecastData?.summary.predictedSpending || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Predicted Spending</p>
          <p className="text-xs text-primary mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Next month
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(forecastData?.summary.predictedSavings || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Predicted Savings</p>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            {forecastData?.summary.savingsRate}% savings rate
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{forecastData?.summary.confidenceScore || 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Confidence Score</p>
          <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
            Based on 6 months of data
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">15</p>
          <p className="text-xs text-muted-foreground mt-1">Days Until Payday</p>
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
            Budget on track
          </p>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LineChart className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            By Category
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Forecast Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Spending Forecast</h3>
                <p className="text-sm text-muted-foreground">Historical data and future predictions</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/40" style={{ background: "repeating-linear-gradient(45deg, var(--primary), var(--primary) 2px, transparent 2px, transparent 4px)" }} />
                  <span>Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Income</span>
                </div>
              </div>
            </div>
            
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="md" variant="minimal" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: "#888", fontSize: 12 }}
                      axisLine={{ stroke: "#333" }}
                    />
                    <YAxis 
                      tick={{ fill: "#888", fontSize: 12 }}
                      axisLine={{ stroke: "#333" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#111", 
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      fill="#10b98130"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Income"
                    />
                    <Bar
                      dataKey="actual"
                      fill="var(--primary)"
                      name="Actual Spending"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="forecast"
                      fill="var(--primary)"
                      fillOpacity={0.4}
                      name="Forecasted"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Income Trend"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Alerts Section */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Smart Insights</h3>
            <div className="space-y-3">
              {forecastData?.summary.alerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border flex items-start gap-3 ${
                    alert.type === "warning" 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : alert.type === "success"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-blue-500/5 border-blue-500/20"
                  }`}
                >
                  {getAlertIcon(alert.type)}
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Category Forecasts</h3>
            <div className="space-y-4">
              {forecastData?.categoryForecasts.map((cat, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{cat.category}</h4>
                      {getTrendIcon(cat.trend)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cat.confidence}% confidence
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Current: </span>
                      <span className="font-medium">{formatCurrency(cat.current)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Forecast: </span>
                      <span className={`font-medium ${
                        cat.trend === "up" ? "text-red-500" : 
                        cat.trend === "down" ? "text-emerald-500" : ""
                      }`}>
                        {formatCurrency(cat.forecast)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        cat.trend === "up" ? "bg-red-500" : 
                        cat.trend === "down" ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${(cat.forecast / (cat.current * 1.5)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Budget Impact
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your forecast, here&apos;s how your budgets will be affected:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-sm">Groceries</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">Under budget</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-sm">Shopping</span>
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50">At risk</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <span className="text-sm">Entertainment</span>
                  <Badge variant="outline">On track</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Recommendations
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-1">Reduce Shopping Expenses</p>
                  <p className="text-xs text-muted-foreground">
                    Consider setting a weekly shopping limit of RM 200 to stay within budget.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-1">Optimize Subscriptions</p>
                  <p className="text-xs text-muted-foreground">
                    You have 3 streaming services. Consider consolidating to save RM 45/month.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-1">Increase Emergency Fund</p>
                  <p className="text-xs text-muted-foreground">
                    Your savings rate allows for RM 500 extra to emergency fund monthly.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
