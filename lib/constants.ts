// Application constants

export const APP_NAME = "Prismo Finance";
export const APP_DESCRIPTION = "Premium Financial Management for Malaysia";

// Currencies supported
export const CURRENCIES = [
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
] as const;

// Payment methods
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "online_banking", label: "Online Banking" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "tng", label: "Touch 'n Go" },
  { value: "grab_pay", label: "GrabPay" },
  { value: "boost", label: "Boost" },
  { value: "shopee_pay", label: "ShopeePay" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
] as const;

// Subscription frequencies
export const SUBSCRIPTION_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

// Budget periods
export const BUDGET_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

// Chart colors for data visualization
export const CHART_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
];

// Financial health score thresholds
export const HEALTH_SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20,
} as const;

// Achievement types
export const ACHIEVEMENT_TYPES = {
  FIRST_TRANSACTION: "first_transaction",
  SAVINGS_STREAK_7: "savings_streak_7",
  SAVINGS_STREAK_30: "savings_streak_30",
  BUDGET_ADHERENCE: "budget_adherence",
  GOAL_ACHIEVED: "goal_achieved",
  TAX_OPTIMIZED: "tax_optimized",
  RECEIPT_SCANNER: "receipt_scanner",
  NET_WORTH_MILESTONE: "net_worth_milestone",
} as const;

// Dashboard widget types
export const DASHBOARD_WIDGETS = [
  "net_worth",
  "cash_flow",
  "budget_overview",
  "spending_by_category",
  "upcoming_bills",
  "financial_health",
  "goals_progress",
  "recent_transactions",
  "tax_deductions",
  "subscription_overview",
] as const;

// Date formats
export const DATE_FORMATS = {
  SHORT: "MMM d, yyyy",
  LONG: "MMMM d, yyyy",
  NUMERIC: "dd/MM/yyyy",
  ISO: "yyyy-MM-dd",
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

// Tax year (Malaysia follows calendar year)
export const CURRENT_TAX_YEAR = new Date().getFullYear();

// LHDN e-filing deadline
export const TAX_FILING_DEADLINE = {
  EMPLOYEE: new Date(CURRENT_TAX_YEAR, 3, 30), // April 30
  BUSINESS: new Date(CURRENT_TAX_YEAR, 5, 30), // June 30
};

// Routes
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/dashboard/transactions",
  SUBSCRIPTIONS: "/dashboard/subscriptions",
  GOALS: "/dashboard/goals",
  BUDGETS: "/dashboard/budgets",
  TAX: "/dashboard/tax",
  DOCUMENTS: "/dashboard/documents",
  SETTINGS: "/dashboard/settings",
  SIGN_IN: "/signin",
  SIGN_UP: "/signup",
} as const;
