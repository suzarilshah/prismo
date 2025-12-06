// Type definitions for the application

export type TransactionType = "income" | "expense";
export type CategoryType = "income" | "expense";
export type SubscriptionFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type BudgetPeriod = "monthly" | "quarterly" | "yearly";
export type Theme = "light" | "dark" | "system";
export type Currency = "MYR" | "USD" | "SGD" | "EUR" | "GBP" | "JPY" | "CNY" | "THB" | "IDR";

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  salary: number | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  type: CategoryType;
  parentId: string | null;
  isTaxDeductible: boolean;
  taxCategory: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  currency: string;
  description: string | null;
  date: Date;
  type: TransactionType;
  paymentMethod: string | null;
  vendor: string | null;
  receiptId: string | null;
  isRecurring: boolean;
  recurringId: string | null;
  tags: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  categoryId: string | null;
  name: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  nextBillingDate: Date;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  reminderDays: number;
  notes: string | null;
  website: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: Date | null;
  category: string | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date | null;
  alertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  transactionId: string | null;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  ocrData: any;
  vendor: string | null;
  amount: number | null;
  date: Date | null;
  taxYear: number | null;
  category: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxDeduction {
  id: string;
  userId: string;
  year: number;
  category: string;
  amount: number;
  maxAmount: number | null;
  description: string | null;
  documentIds: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  icon: string | null;
  earnedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: Theme;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    billReminders: boolean;
    goalMilestones: boolean;
  };
  dashboardWidgets: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard Types
export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  topCategory: string;
  transactionCount: number;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface TrendData {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
}

export interface FinancialHealthScore {
  score: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  budgetAdherence: number;
  insights: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
