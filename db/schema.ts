import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  index,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// FINANCE GROUPS (WORKSPACES)
// ============================================

// Finance Groups - Each user can have multiple finance groups (workspaces)
// This enables separation of personal, business, family finances etc.
export const financeGroups = pgTable(
  "finance_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).default("personal"), // 'personal', 'family', 'business', 'investment', 'side_hustle'
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 7 }),
    currency: varchar("currency", { length: 3 }).default("MYR"),
    // Settings
    isDefault: boolean("is_default").default(false), // User's default/primary group
    isActive: boolean("is_active").default(true),
    // Forecasting data collection settings
    enableForecasting: boolean("enable_forecasting").default(true),
    forecastingPeriod: integer("forecasting_period").default(12), // months ahead
    // Metadata for analytics
    totalMembers: integer("total_members").default(1),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    ownerIdx: index("finance_groups_owner_idx").on(table.ownerId),
  })
);

// Finance Group Members - Role-based access control for collaboration
export const financeGroupMembers = pgTable(
  "finance_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Role-based access
    role: varchar("role", { length: 30 }).notNull().default("viewer"), // 'owner', 'admin', 'editor', 'viewer'
    // Relationship category for context
    relationship: varchar("relationship", { length: 30 }), // 'spouse', 'family', 'friend', 'accountant', 'auditor', 'business_partner'
    // Granular permissions
    permissions: jsonb("permissions").$type<{
      viewTransactions: boolean;
      editTransactions: boolean;
      viewBudgets: boolean;
      editBudgets: boolean;
      viewGoals: boolean;
      editGoals: boolean;
      viewTax: boolean;
      editTax: boolean;
      viewCommitments: boolean;
      editCommitments: boolean;
      viewReports: boolean;
      exportData: boolean;
      inviteMembers: boolean;
      manageMembers: boolean;
    }>(),
    // Status
    status: varchar("status", { length: 20 }).default("active"), // 'active', 'suspended', 'removed'
    // Notification preferences for this group
    notificationPrefs: jsonb("notification_prefs").$type<{
      budgetAlerts: boolean;
      transactionNotify: boolean;
      goalMilestones: boolean;
      weeklyDigest: boolean;
    }>(),
    joinedAt: timestamp("joined_at").defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    groupUserIdx: uniqueIndex("finance_group_members_unique").on(table.financeGroupId, table.userId),
    userIdx: index("finance_group_members_user_idx").on(table.userId),
  })
);

// Finance Group Invites - Invitation system for collaboration
export const financeGroupInvites = pgTable(
  "finance_group_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" })
      .notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Invitee details
    inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),
    inviteeName: varchar("invitee_name", { length: 255 }),
    // Role and permissions for invitee
    proposedRole: varchar("proposed_role", { length: 30 }).notNull().default("viewer"),
    proposedRelationship: varchar("proposed_relationship", { length: 30 }),
    proposedPermissions: jsonb("proposed_permissions").$type<{
      viewTransactions: boolean;
      editTransactions: boolean;
      viewBudgets: boolean;
      editBudgets: boolean;
      viewGoals: boolean;
      editGoals: boolean;
      viewTax: boolean;
      editTax: boolean;
      viewCommitments: boolean;
      editCommitments: boolean;
      viewReports: boolean;
      exportData: boolean;
      inviteMembers: boolean;
      manageMembers: boolean;
    }>(),
    // Custom message from inviter
    message: text("message"),
    // Invite status
    status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'declined', 'expired', 'cancelled'
    // Secure token for invite link
    inviteToken: varchar("invite_token", { length: 100 }).unique().notNull(),
    // Timing
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    // If accepted, track the resulting membership
    resultingMembershipId: uuid("resulting_membership_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    groupIdx: index("finance_group_invites_group_idx").on(table.financeGroupId),
    tokenIdx: index("finance_group_invites_token_idx").on(table.inviteToken),
    emailIdx: index("finance_group_invites_email_idx").on(table.inviteeEmail),
  })
);

// Finance Group Activity Log - Track all activities for audit
export const financeGroupActivity = pgTable(
  "finance_group_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" }),
    // Activity details
    activityType: varchar("activity_type", { length: 50 }).notNull(), // 'transaction_created', 'budget_updated', 'member_invited', etc.
    entityType: varchar("entity_type", { length: 50 }), // 'transaction', 'budget', 'goal', etc.
    entityId: uuid("entity_id"),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // IP and device info for security
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    groupIdx: index("finance_group_activity_group_idx").on(table.financeGroupId),
    userIdx: index("finance_group_activity_user_idx").on(table.userId),
    typeIdx: index("finance_group_activity_type_idx").on(table.activityType),
    dateIdx: index("finance_group_activity_date_idx").on(table.createdAt),
  })
);

// ============================================
// FORECASTING METRICS
// ============================================

// User Spending Patterns - Aggregate metrics for forecasting
export const spendingPatterns = pgTable(
  "spending_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Period
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    // Spending velocity metrics
    avgDailySpend: decimal("avg_daily_spend", { precision: 12, scale: 2 }),
    maxDailySpend: decimal("max_daily_spend", { precision: 12, scale: 2 }),
    minDailySpend: decimal("min_daily_spend", { precision: 12, scale: 2 }),
    spendingVelocity: decimal("spending_velocity", { precision: 5, scale: 2 }), // % spent within first week of income
    // Category patterns
    topCategories: jsonb("top_categories").$type<Array<{
      categoryId: string;
      name: string;
      amount: number;
      percentage: number;
    }>>(),
    // Time-based patterns
    weekdaySpending: decimal("weekday_spending", { precision: 12, scale: 2 }),
    weekendSpending: decimal("weekend_spending", { precision: 12, scale: 2 }),
    peakSpendingHour: integer("peak_spending_hour"),
    peakSpendingDay: integer("peak_spending_day"), // 0-6 (Sunday-Saturday)
    // Income patterns
    totalIncome: decimal("total_income", { precision: 14, scale: 2 }),
    incomeFrequency: varchar("income_frequency", { length: 20 }), // 'monthly', 'bi_weekly', 'irregular'
    daysToNextIncome: integer("days_to_next_income"),
    // Budget adherence
    budgetAdherenceRate: decimal("budget_adherence_rate", { precision: 5, scale: 2 }),
    overBudgetCategories: integer("over_budget_categories"),
    // Savings metrics
    savingsRate: decimal("savings_rate", { precision: 5, scale: 2 }),
    discretionarySpendRate: decimal("discretionary_spend_rate", { precision: 5, scale: 2 }),
    // Vendor patterns
    topVendors: jsonb("top_vendors").$type<Array<{
      vendor: string;
      amount: number;
      count: number;
    }>>(),
    uniqueVendorsCount: integer("unique_vendors_count"),
    // Transaction patterns
    totalTransactions: integer("total_transactions"),
    avgTransactionAmount: decimal("avg_transaction_amount", { precision: 12, scale: 2 }),
    recurringTransactions: integer("recurring_transactions"),
    // Metadata
    calculatedAt: timestamp("calculated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    groupPeriodIdx: uniqueIndex("spending_patterns_period_idx").on(
      table.financeGroupId,
      table.year,
      table.month
    ),
  })
);

// Users table - Enhanced with tax profile and family linking
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"), // Nullable for Stack Auth users
  stackId: text("stack_id").unique(), // ID from Stack Auth
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  emailVerified: boolean("email_verified").default(false),
  currency: varchar("currency", { length: 3 }).default("MYR"),
  // Income & Employment
  salary: decimal("salary", { precision: 12, scale: 2 }),
  annualIncome: decimal("annual_income", { precision: 12, scale: 2 }),
  occupation: varchar("occupation", { length: 100 }),
  employerName: varchar("employer_name", { length: 255 }),
  employmentType: varchar("employment_type", { length: 50 }), // 'employed', 'self_employed', 'retired', 'unemployed'
  // Tax Profile (Malaysia LHDN)
  icNumber: varchar("ic_number", { length: 20 }), // Malaysian IC for tax identification
  taxFileNumber: varchar("tax_file_number", { length: 50 }), // LHDN tax file number
  taxResidentStatus: varchar("tax_resident_status", { length: 20 }).default("resident"), // 'resident', 'non_resident'
  maritalStatus: varchar("marital_status", { length: 20 }).default("single"), // 'single', 'married', 'divorced', 'widowed'
  taxAssessmentType: varchar("tax_assessment_type", { length: 30 }).default("separate"), // 'separate', 'joint_husband', 'joint_wife'
  numberOfDependents: integer("number_of_dependents").default(0),
  epfNumber: varchar("epf_number", { length: 50 }),
  socsoNumber: varchar("socso_number", { length: 50 }),
  // Family Linking
  householdId: uuid("household_id"), // Links family members together
  householdRole: varchar("household_role", { length: 20 }), // 'primary', 'spouse', 'dependent'
  spouseId: uuid("spouse_id"), // Direct link to spouse for joint filing
  // Profile
  dateOfBirth: date("date_of_birth"),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // hex color
  icon: varchar("icon", { length: 50 }),
  type: varchar("type", { length: 20 }).notNull(), // 'expense' | 'income'
  parentId: uuid("parent_id"), // for subcategories
  isTaxDeductible: boolean("is_tax_deductible").default(false),
  taxCategory: varchar("tax_category", { length: 50 }), // LHDN category
  taxReliefLimit: decimal("tax_relief_limit", { precision: 12, scale: 2 }), // Max tax relief for this category
  isSystem: boolean("is_system").default(false), // predefined categories
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors table
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  description: text("description"),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  logo: varchar("logo", { length: 255 }),
  defaultPaymentMethod: varchar("default_payment_method", { length: 50 }),
  isFavorite: boolean("is_favorite").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("MYR"),
    description: text("description"),
    date: timestamp("date").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'expense' | 'income'
    // Income-specific fields
    incomeType: varchar("income_type", { length: 30 }), // 'salary', 'bonus', 'freelance', 'investment', 'commission', 'other'
    incomeMonth: integer("income_month"), // 1-12 for which month this income is for
    incomeYear: integer("income_year"), // Year the income is for (e.g., 2025)
    // Payment Method - Updated for comprehensive tracking
    paymentMethod: varchar("payment_method", { length: 50 }), // 'bank_debit', 'credit_card', 'tng_ewallet', 'mae_qr', 'grabpay', 'boost', 'shopeepay', 'cash', 'bank_transfer', 'fpx', 'duitnow', 'other'
    creditCardId: uuid("credit_card_id"), // Reference to credit card if payment method is 'credit_card'
    vendor: varchar("vendor", { length: 255 }),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    receiptId: uuid("receipt_id"), // link to document
    isRecurring: boolean("is_recurring").default(false),
    recurringId: uuid("recurring_id"), // link to subscription
    tags: jsonb("tags").$type<string[]>(),
    notes: text("notes"),
    plaidTransactionId: varchar("plaid_transaction_id", { length: 255 }),
    // Tax deduction eligibility
    isTaxDeductible: boolean("is_tax_deductible").default(false),
    taxDeductionId: uuid("tax_deduction_id"), // Link to tax deduction record
    taxCategory: varchar("tax_category", { length: 100 }), // LHDN category if tax deductible
    // Invoice/Receipt status for tax
    invoiceStatus: varchar("invoice_status", { length: 30 }), // 'not_required', 'pending', 'requested', 'received', 'verified', 'rejected'
    invoiceRequestedAt: timestamp("invoice_requested_at"),
    invoiceReceivedAt: timestamp("invoice_received_at"),
    invoiceUrl: text("invoice_url"),
    invoiceFileId: varchar("invoice_file_id", { length: 100 }),
    // Location data for analysis
    location: varchar("location", { length: 255 }),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    // Time tracking for forecasting
    transactionHour: integer("transaction_hour"), // 0-23 for time of day analysis
    dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    financeGroupIdx: index("transactions_finance_group_idx").on(table.financeGroupId),
    dateIdx: index("transactions_date_idx").on(table.date),
    categoryIdx: index("transactions_category_idx").on(table.categoryId),
    incomeTypeIdx: index("transactions_income_type_idx").on(table.incomeType),
    taxDeductibleIdx: index("transactions_tax_deductible_idx").on(table.isTaxDeductible),
    invoiceStatusIdx: index("transactions_invoice_status_idx").on(table.invoiceStatus),
    creditCardIdx: index("transactions_credit_card_idx").on(table.creditCardId),
    paymentMethodIdx: index("transactions_payment_method_idx").on(table.paymentMethod),
  })
);

// Subscriptions/Recurring Commitments table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("MYR"),
  frequency: varchar("frequency", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  nextBillingDate: timestamp("next_billing_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  reminderDays: integer("reminder_days").default(3),
  notes: text("notes"),
  website: varchar("website", { length: 255 }),
  icon: varchar("icon", { length: 255 }),
  // Payment Method
  paymentMethod: varchar("payment_method", { length: 50 }), // 'bank_debit', 'credit_card', 'tng_ewallet', etc.
  creditCardId: uuid("credit_card_id"), // Reference to credit card if payment method is 'credit_card'
  // Plan type for upgrades/downgrades
  planTier: varchar("plan_tier", { length: 50 }), // 'free', 'basic', 'premium', 'enterprise', etc.
  // Termination fields
  terminatedAt: timestamp("terminated_at"),
  terminationReason: varchar("termination_reason", { length: 255 }),
  terminationEffectiveDate: timestamp("termination_effective_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Payments - Track payment status per billing cycle
export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .references(() => subscriptions.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Billing period
    billingYear: integer("billing_year").notNull(),
    billingMonth: integer("billing_month").notNull(),
    // Payment details
    expectedAmount: decimal("expected_amount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    isPaid: boolean("is_paid").default(false),
    paidAt: timestamp("paid_at"),
    // Link to transaction
    transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    // Payment Method
    paymentMethod: varchar("payment_method", { length: 50 }),
    creditCardId: uuid("credit_card_id"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    subscriptionIdx: index("subscription_payments_subscription_idx").on(table.subscriptionId),
    periodIdx: index("subscription_payments_period_idx").on(table.billingYear, table.billingMonth),
    creditCardIdx: index("subscription_payments_credit_card_idx").on(table.creditCardId),
  })
);

// Subscription Amount History - Track plan changes
export const subscriptionAmountHistory = pgTable(
  "subscription_amount_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .references(() => subscriptions.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Amount tracking
    previousAmount: decimal("previous_amount", { precision: 12, scale: 2 }).notNull(),
    newAmount: decimal("new_amount", { precision: 12, scale: 2 }).notNull(),
    previousPlanTier: varchar("previous_plan_tier", { length: 50 }),
    newPlanTier: varchar("new_plan_tier", { length: 50 }),
    changeType: varchar("change_type", { length: 20 }).notNull(), // 'upgrade', 'downgrade', 'initial'
    // Effective date
    effectiveDate: timestamp("effective_date").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    subscriptionIdx: index("subscription_amount_history_subscription_idx").on(table.subscriptionId),
    effectiveDateIdx: index("subscription_amount_history_effective_idx").on(table.effectiveDate),
  })
);

// ============================================
// CREDIT CARDS & PAYMENT METHODS
// ============================================

// Malaysian Banks for Credit Cards
export const MALAYSIAN_BANKS = [
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
  "Agrobank"
] as const;

// Credit Card Types
export const CREDIT_CARD_TYPES = [
  "Visa",
  "Mastercard",
  "American Express",
  "UnionPay",
  "JCB",
  "Diners Club"
] as const;

// Payment Method Types
export const PAYMENT_METHOD_TYPES = [
  "bank_debit",        // Debit from Bank Account
  "credit_card",       // Credit Card
  "tng_ewallet",       // Touch 'n Go eWallet
  "mae_qr",            // MAE QR code
  "grabpay",           // GrabPay
  "boost",             // Boost eWallet
  "shopeepay",         // ShopeePay
  "cash",              // Cash
  "bank_transfer",     // Bank Transfer / IBG / IBFT
  "fpx",               // FPX Online Banking
  "duitnow",           // DuitNow QR / Transfer
  "other"              // Other
] as const;

// Credit Cards table - Store enrolled credit cards
export const creditCards = pgTable(
  "credit_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
    // Card Details
    bankName: varchar("bank_name", { length: 100 }).notNull(),
    cardType: varchar("card_type", { length: 50 }).notNull(), // Visa, Mastercard, etc.
    cardName: varchar("card_name", { length: 255 }).notNull(), // e.g., "Maybank Islamic Visa Infinite"
    // Card Appearance (for 3D card display)
    cardColor: varchar("card_color", { length: 50 }).default("gradient-blue"), // Preset color themes
    cardDesign: varchar("card_design", { length: 50 }).default("modern"), // Design template
    // Last 4 digits (optional, for identification)
    lastFourDigits: varchar("last_four_digits", { length: 4 }),
    // Credit Limit Tracking (optional)
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    // Billing Information
    billingCycleDay: integer("billing_cycle_day"), // Day of month when billing cycle ends (1-31)
    paymentDueDay: integer("payment_due_day"), // Day of month when payment is due
    // Status
    isActive: boolean("is_active").default(true),
    isPrimary: boolean("is_primary").default(false), // Primary card for quick selection
    // Notes
    notes: text("notes"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("credit_cards_user_idx").on(table.userId),
    financeGroupIdx: index("credit_cards_finance_group_idx").on(table.financeGroupId),
    activeIdx: index("credit_cards_active_idx").on(table.isActive),
  })
);

// Credit Card Statements - Track monthly statements
export const creditCardStatements = pgTable(
  "credit_card_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creditCardId: uuid("credit_card_id")
      .references(() => creditCards.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Statement Period
    statementYear: integer("statement_year").notNull(),
    statementMonth: integer("statement_month").notNull(),
    // Amounts
    openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0"),
    totalPurchases: decimal("total_purchases", { precision: 12, scale: 2 }).default("0"),
    totalPayments: decimal("total_payments", { precision: 12, scale: 2 }).default("0"),
    closingBalance: decimal("closing_balance", { precision: 12, scale: 2 }).default("0"),
    minimumPaymentDue: decimal("minimum_payment_due", { precision: 12, scale: 2 }),
    // Dates
    statementDate: timestamp("statement_date"),
    paymentDueDate: timestamp("payment_due_date"),
    // Payment Status
    isPaid: boolean("is_paid").default(false),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    paidAt: timestamp("paid_at"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    cardIdx: index("credit_card_statements_card_idx").on(table.creditCardId),
    periodIdx: uniqueIndex("credit_card_statements_period_idx").on(
      table.creditCardId,
      table.statementYear,
      table.statementMonth
    ),
  })
);

// ============================================
// FINANCIAL GOALS
// ============================================

// Financial Goals table
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("MYR"),
  deadline: timestamp("deadline"),
  category: varchar("category", { length: 50 }), // 'savings', 'vacation', 'house', etc.
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budgets table
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(), // 'monthly', 'quarterly', 'yearly'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  alertThreshold: integer("alert_threshold").default(80), // percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents/Receipts table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  transactionId: uuid("transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"), // in bytes
  fileType: varchar("file_type", { length: 50 }), // 'image/jpeg', 'application/pdf', etc.
  fileUrl: text("file_url").notNull(), // Appwrite storage URL
  thumbnailUrl: text("thumbnail_url"),
  ocrData: jsonb("ocr_data"), // extracted data from OCR
  vendor: varchar("vendor", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  date: timestamp("date"),
  taxYear: integer("tax_year"),
  category: varchar("category", { length: 100 }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Deductions table - Enhanced with comprehensive LHDN relief categories
export const taxDeductions = pgTable(
  "tax_deductions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    taxYearId: uuid("tax_year_id").references(() => taxYears.id, { onDelete: "set null" }),
    transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    // LHDN Category Reference
    lhdnCategoryId: uuid("lhdn_category_id").references(() => lhdnReliefCategories.id, { onDelete: "set null" }),
    // Core fields
    year: integer("year").notNull(),
    month: integer("month"), // Month when expense was incurred (1-12)
    category: varchar("category", { length: 100 }).notNull(), // LHDN category code
    lhdnCategory: varchar("lhdn_category", { length: 100 }), // Mapped LHDN relief category name
    reliefType: varchar("relief_type", { length: 20 }).default("relief"), // 'relief', 'deduction', 'rebate'
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    maxAmount: decimal("max_amount", { precision: 12, scale: 2 }),
    claimableAmount: decimal("claimable_amount", { precision: 12, scale: 2 }), // Amount after limits applied
    description: text("description"),
    // Date tracking
    dateIncurred: timestamp("date_incurred"),
    receiptDate: timestamp("receipt_date"),
    // For whom (family member)
    forSelf: boolean("for_self").default(true),
    forSpouse: boolean("for_spouse").default(false),
    forChild: boolean("for_child").default(false),
    forParent: boolean("for_parent").default(false),
    householdMemberId: uuid("household_member_id").references(() => householdMembers.id, { onDelete: "set null" }),
    // Document/Receipt storage (Appwrite)
    documentIds: jsonb("document_ids").$type<string[]>(),
    receiptUrl: text("receipt_url"),
    receiptFileId: varchar("receipt_file_id", { length: 100 }), // Appwrite file ID
    receiptBucketId: varchar("receipt_bucket_id", { length: 100 }), // Appwrite bucket ID
    receiptFileName: varchar("receipt_file_name", { length: 255 }),
    receiptFileType: varchar("receipt_file_type", { length: 50 }),
    receiptThumbnailUrl: text("receipt_thumbnail_url"),
    // OCR/Extraction data
    ocrData: jsonb("ocr_data").$type<{
      vendor?: string;
      amount?: number;
      date?: string;
      items?: string[];
      confidence?: number;
    }>(),
    // Verification
    verified: boolean("verified").default(false),
    verifiedAt: timestamp("verified_at"),
    verificationNotes: text("verification_notes"),
    // Vendor
    vendor: varchar("vendor", { length: 255 }),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    // Notes
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userYearIdx: index("tax_deductions_user_year_idx").on(table.userId, table.year),
    categoryIdx: index("tax_deductions_category_idx").on(table.category),
    dateIdx: index("tax_deductions_date_idx").on(table.dateIncurred),
  })
);

// Achievements table (for gamification)
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'savings_streak', 'budget_adherence', etc.
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// User Settings table
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  theme: varchar("theme", { length: 20 }).default("system"), // 'light', 'dark', 'system'
  language: varchar("language", { length: 10 }).default("en"),
  notifications: jsonb("notifications").$type<{
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    billReminders: boolean;
    goalMilestones: boolean;
    commitmentReminders: boolean;
    taxDeadlines: boolean;
  }>(),
  dashboardWidgets: jsonb("dashboard_widgets").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// HOUSEHOLD & FAMILY MANAGEMENT
// ============================================

// Households table - For family/joint tax filing
export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "The Rashid Family"
  primaryUserId: uuid("primary_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  taxFilingType: varchar("tax_filing_type", { length: 30 }).default("separate"), // 'separate', 'joint_husband', 'joint_wife'
  fiscalYear: integer("fiscal_year").notNull(),
  totalHouseholdIncome: decimal("total_household_income", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("MYR"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Household Invites - For inviting spouse/family members
export const householdInvites = pgTable("household_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .references(() => households.id, { onDelete: "cascade" })
    .notNull(),
  invitedByUserId: uuid("invited_by_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),
  inviteeRole: varchar("invitee_role", { length: 20 }).notNull(), // 'spouse', 'dependent', 'parent'
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'declined', 'expired'
  inviteToken: varchar("invite_token", { length: 100 }).unique(),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Household Members - Track all members in a household
export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .references(() => households.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // For non-user dependents
  relationship: varchar("relationship", { length: 30 }).notNull(), // 'spouse', 'child', 'parent', 'sibling'
  dateOfBirth: date("date_of_birth"),
  icNumber: varchar("ic_number", { length: 20 }),
  isDisabled: boolean("is_disabled").default(false),
  isStudent: boolean("is_student").default(false),
  educationLevel: varchar("education_level", { length: 50 }), // 'primary', 'secondary', 'diploma', 'degree', 'masters', 'phd'
  hasIncome: boolean("has_income").default(false),
  annualIncome: decimal("annual_income", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family Expenses - Shared household expenses
export const familyExpenses = pgTable(
  "family_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    recordedByUserId: uuid("recorded_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    memberId: uuid("member_id").references(() => householdMembers.id, { onDelete: "set null" }), // Which family member this expense is for
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("MYR"),
    description: text("description"),
    date: timestamp("date").notNull(),
    expenseType: varchar("expense_type", { length: 50 }), // 'education', 'medical', 'childcare', 'household', 'transport', 'utilities'
    isTaxDeductible: boolean("is_tax_deductible").default(false),
    taxReliefCategory: varchar("tax_relief_category", { length: 100 }),
    receiptUrl: text("receipt_url"),
    documentId: uuid("document_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    householdIdx: index("family_expenses_household_idx").on(table.householdId),
    dateIdx: index("family_expenses_date_idx").on(table.date),
  })
);

// ============================================
// COMMITMENTS & RECURRING PAYMENTS
// ============================================

// Commitments table - Bills, loans, and recurring payments
export const commitments = pgTable(
  "commitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    financeGroupId: uuid("finance_group_id").references(() => financeGroups.id, { onDelete: "cascade" }),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("MYR"),
    // Commitment Type
    commitmentType: varchar("commitment_type", { length: 30 }).notNull(), // 'loan', 'bill', 'insurance', 'subscription', 'rent', 'mortgage', 'car_loan', 'education_loan', 'credit_card', 'other'
    // Schedule
    frequency: varchar("frequency", { length: 20 }).notNull(), // 'monthly', 'quarterly', 'yearly', 'one_time'
    dueDay: integer("due_day"), // Day of month (1-31) when payment is due
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"), // For loans with end dates
    nextDueDate: timestamp("next_due_date").notNull(),
    // Additional Info
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }), // For loans - total loan amount
    remainingAmount: decimal("remaining_amount", { precision: 14, scale: 2 }), // For loans - remaining balance
    interestRate: decimal("interest_rate", { precision: 5, scale: 2 }), // For loans
    payee: varchar("payee", { length: 255 }), // Who receives the payment
    accountNumber: varchar("account_number", { length: 100 }), // Account/Reference number
    autoPayEnabled: boolean("auto_pay_enabled").default(false),
    // Payment Method
    paymentMethod: varchar("payment_method", { length: 50 }), // 'bank_debit', 'credit_card', 'tng_ewallet', etc.
    creditCardId: uuid("credit_card_id"), // Reference to credit card if payment method is 'credit_card'
    // Status
    isActive: boolean("is_active").default(true),
    isPriority: boolean("is_priority").default(false),
    // Termination
    terminatedAt: timestamp("terminated_at"),
    terminationReason: varchar("termination_reason", { length: 255 }),
    terminationEffectiveDate: timestamp("termination_effective_date"), // When the termination takes effect
    // Reminders
    reminderEnabled: boolean("reminder_enabled").default(true),
    reminderDaysBefore: integer("reminder_days_before").default(3),
    // Tax
    isTaxDeductible: boolean("is_tax_deductible").default(false),
    taxCategory: varchar("tax_category", { length: 100 }),
    // Link to subscription if it's from subscriptions
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    // Metadata
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 7 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("commitments_user_idx").on(table.userId),
    nextDueIdx: index("commitments_next_due_idx").on(table.nextDueDate),
    typeIdx: index("commitments_type_idx").on(table.commitmentType),
  })
);

// Commitment Payments - Track monthly payment status (checklist)
export const commitmentPayments = pgTable(
  "commitment_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .references(() => commitments.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Period tracking
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    dueDate: timestamp("due_date").notNull(),
    // Payment status
    status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'paid', 'overdue', 'skipped', 'partial'
    isPaid: boolean("is_paid").default(false),
    paidAt: timestamp("paid_at"),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    // Link to transaction when paid
    transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    // Payment Method
    paymentMethod: varchar("payment_method", { length: 50 }),
    creditCardId: uuid("credit_card_id"),
    // Receipt
    receiptUrl: text("receipt_url"),
    documentId: uuid("document_id"),
    // Notes
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    commitmentIdx: index("commitment_payments_commitment_idx").on(table.commitmentId),
    periodIdx: index("commitment_payments_period_idx").on(table.year, table.month),
    statusIdx: index("commitment_payments_status_idx").on(table.status),
    creditCardIdx: index("commitment_payments_credit_card_idx").on(table.creditCardId),
  })
);

// Commitment Amount History - Track amount changes (upgrades/downgrades)
export const commitmentAmountHistory = pgTable(
  "commitment_amount_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .references(() => commitments.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Amount tracking
    previousAmount: decimal("previous_amount", { precision: 12, scale: 2 }).notNull(),
    newAmount: decimal("new_amount", { precision: 12, scale: 2 }).notNull(),
    changeType: varchar("change_type", { length: 20 }).notNull(), // 'upgrade', 'downgrade', 'initial'
    // Effective date - when the new amount takes effect
    effectiveDate: timestamp("effective_date").notNull(),
    // Reason for change
    reason: text("reason"),
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    commitmentIdx: index("commitment_amount_history_commitment_idx").on(table.commitmentId),
    effectiveDateIdx: index("commitment_amount_history_effective_idx").on(table.effectiveDate),
  })
);

// ============================================
// ENHANCED TAX MANAGEMENT (Malaysia LHDN)
// ============================================

// LHDN Tax Relief Categories - Reference table for all relief types
export const lhdnReliefCategories = pgTable("lhdn_relief_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameMs: varchar("name_ms", { length: 255 }), // Malay name
  description: text("description"),
  maxAmount: decimal("max_amount", { precision: 12, scale: 2 }),
  reliefType: varchar("relief_type", { length: 20 }).notNull(), // 'relief', 'deduction', 'rebate'
  applicableTo: varchar("applicable_to", { length: 30 }).default("individual"), // 'individual', 'spouse', 'child', 'parent', 'all'
  requiresReceipt: boolean("requires_receipt").default(true),
  requiresVerification: boolean("requires_verification").default(false),
  validFromYear: integer("valid_from_year"),
  validUntilYear: integer("valid_until_year"),
  conditions: jsonb("conditions").$type<{
    maritalStatus?: string[];
    hasChildren?: boolean;
    hasDisabledDependent?: boolean;
    incomeThreshold?: number;
    otherConditions?: string[];
  }>(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Years - Track fiscal year data for each user
export const taxYears = pgTable(
  "tax_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "set null" }),
    year: integer("year").notNull(), // e.g., 2024 for YA 2024
    // Income
    grossIncome: decimal("gross_income", { precision: 14, scale: 2 }),
    employmentIncome: decimal("employment_income", { precision: 14, scale: 2 }),
    businessIncome: decimal("business_income", { precision: 14, scale: 2 }),
    rentalIncome: decimal("rental_income", { precision: 14, scale: 2 }),
    dividendIncome: decimal("dividend_income", { precision: 14, scale: 2 }),
    interestIncome: decimal("interest_income", { precision: 14, scale: 2 }),
    otherIncome: decimal("other_income", { precision: 14, scale: 2 }),
    // Calculated fields
    totalReliefs: decimal("total_reliefs", { precision: 14, scale: 2 }),
    totalDeductions: decimal("total_deductions", { precision: 14, scale: 2 }),
    totalRebates: decimal("total_rebates", { precision: 14, scale: 2 }),
    chargeableIncome: decimal("chargeable_income", { precision: 14, scale: 2 }),
    taxPayable: decimal("tax_payable", { precision: 14, scale: 2 }),
    pcbPaid: decimal("pcb_paid", { precision: 14, scale: 2 }), // Monthly Tax Deduction paid
    taxRefund: decimal("tax_refund", { precision: 14, scale: 2 }), // Estimated refund
    taxOwed: decimal("tax_owed", { precision: 14, scale: 2 }), // Estimated owed
    // Filing status
    assessmentType: varchar("assessment_type", { length: 30 }), // 'separate', 'joint_husband', 'joint_wife'
    filingStatus: varchar("filing_status", { length: 20 }).default("draft"), // 'draft', 'ready', 'filed', 'assessed'
    filedAt: timestamp("filed_at"),
    lhdnReferenceNumber: varchar("lhdn_reference_number", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userYearIdx: index("tax_years_user_year_idx").on(table.userId, table.year),
  })
);

// Monthly PCB Records - Track monthly tax deductions
export const monthlyPcbRecords = pgTable(
  "monthly_pcb_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    taxYearId: uuid("tax_year_id").references(() => taxYears.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    // Income
    grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }),
    bonus: decimal("bonus", { precision: 12, scale: 2 }),
    allowances: decimal("allowances", { precision: 12, scale: 2 }),
    commission: decimal("commission", { precision: 12, scale: 2 }),
    totalIncome: decimal("total_income", { precision: 12, scale: 2 }),
    // Deductions
    epfEmployee: decimal("epf_employee", { precision: 12, scale: 2 }), // Employee's EPF contribution
    socso: decimal("socso", { precision: 12, scale: 2 }),
    eis: decimal("eis", { precision: 12, scale: 2 }),
    zakat: decimal("zakat", { precision: 12, scale: 2 }),
    // PCB
    pcbAmount: decimal("pcb_amount", { precision: 12, scale: 2 }), // Monthly tax deduction
    // Cumulative (YTD)
    ytdIncome: decimal("ytd_income", { precision: 14, scale: 2 }),
    ytdPcb: decimal("ytd_pcb", { precision: 14, scale: 2 }),
    ytdEpf: decimal("ytd_epf", { precision: 14, scale: 2 }),
    // Receipt/Payslip
    payslipUrl: text("payslip_url"),
    documentId: uuid("document_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userPeriodIdx: index("monthly_pcb_user_period_idx").on(table.userId, table.year, table.month),
  })
);

// ============================================
// NOTIFICATIONS SYSTEM
// ============================================

// Notification Types Enum
export const NOTIFICATION_TYPES = {
  // Transaction & Income
  INCOME_ADDED: 'income_added',
  INCOME_EDITED: 'income_edited',
  TRANSACTION_ADDED: 'transaction_added',
  
  // Vendors
  VENDOR_ADDED: 'vendor_added',
  VENDOR_REMOVED: 'vendor_removed',
  
  // Budgets
  BUDGET_ADDED: 'budget_added',
  BUDGET_THRESHOLD_WARNING: 'budget_threshold_warning',
  BUDGET_THRESHOLD_EXCEEDED: 'budget_threshold_exceeded',
  
  // Goals
  GOAL_ADDED: 'goal_added',
  GOAL_EDITED: 'goal_edited',
  GOAL_PROGRESS_50: 'goal_progress_50',
  GOAL_PROGRESS_75: 'goal_progress_75',
  GOAL_PROGRESS_100: 'goal_progress_100',
  
  // Subscriptions
  SUBSCRIPTION_ADDED: 'subscription_added',
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  SUBSCRIPTION_DUE_TODAY: 'subscription_due_today',
  SUBSCRIPTION_OVERDUE: 'subscription_overdue',
  
  // Commitments
  COMMITMENT_ADDED: 'commitment_added',
  COMMITMENT_REMINDER: 'commitment_reminder',
  COMMITMENT_DUE_TODAY: 'commitment_due_today',
  COMMITMENT_OVERDUE: 'commitment_overdue',
  
  // Tax
  TAX_DEDUCTION_ADDED: 'tax_deduction_added',
  TAX_FILING_REMINDER: 'tax_filing_reminder',
  TAX_DEADLINE_APPROACHING: 'tax_deadline_approaching',
  
  // Finance Groups
  FINANCE_GROUP_CREATED: 'finance_group_created',
  FINANCE_GROUP_EDITED: 'finance_group_edited',
  FINANCE_GROUP_DELETED: 'finance_group_deleted',
  FINANCE_GROUP_INVITE_SENT: 'finance_group_invite_sent',
  FINANCE_GROUP_INVITE_RECEIVED: 'finance_group_invite_received',
  FINANCE_GROUP_INVITE_ACCEPTED: 'finance_group_invite_accepted',
  FINANCE_GROUP_INVITE_DECLINED: 'finance_group_invite_declined',
  FINANCE_GROUP_MEMBER_JOINED: 'finance_group_member_joined',
  FINANCE_GROUP_MEMBER_LEFT: 'finance_group_member_left',
  FINANCE_GROUP_MEMBER_CHANGE: 'finance_group_member_change',
  
  // Settings
  SETTINGS_CHANGED: 'settings_changed',
  PROFILE_UPDATED: 'profile_updated',
  
  // System
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
} as const;

// Notifications table - Main notification log
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Notification content
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    // Categorization
    category: varchar("category", { length: 30 }).notNull(), // 'transaction', 'budget', 'goal', 'subscription', 'commitment', 'tax', 'finance_group', 'settings', 'system'
    priority: varchar("priority", { length: 20 }).default("normal"), // 'low', 'normal', 'high', 'urgent'
    // Status
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    isDismissed: boolean("is_dismissed").default(false),
    dismissedAt: timestamp("dismissed_at"),
    // Link to related entity
    entityType: varchar("entity_type", { length: 50 }), // 'transaction', 'budget', 'goal', 'subscription', 'commitment', 'tax_deduction', 'finance_group'
    entityId: uuid("entity_id"),
    // Action link (for navigation)
    actionUrl: varchar("action_url", { length: 500 }),
    actionLabel: varchar("action_label", { length: 100 }),
    // Additional metadata
    metadata: jsonb("metadata").$type<{
      amount?: number;
      currency?: string;
      percentComplete?: number;
      daysUntilDue?: number;
      previousValue?: string;
      newValue?: string;
      changedBy?: string;
      changedByName?: string;
      additionalInfo?: Record<string, unknown>;
    }>(),
    // Icon and styling
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 20 }),
    // Triggered by (for collaborative notifications)
    triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, { onDelete: "set null" }),
    // Expiration (for time-sensitive notifications)
    expiresAt: timestamp("expires_at"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    typeIdx: index("notifications_type_idx").on(table.type),
    categoryIdx: index("notifications_category_idx").on(table.category),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    entityIdx: index("notifications_entity_idx").on(table.entityType, table.entityId),
  })
);

// Notification Preferences - User-specific notification settings
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    // Enable/disable by category
    enableTransactions: boolean("enable_transactions").default(true),
    enableBudgets: boolean("enable_budgets").default(true),
    enableGoals: boolean("enable_goals").default(true),
    enableSubscriptions: boolean("enable_subscriptions").default(true),
    enableCommitments: boolean("enable_commitments").default(true),
    enableTax: boolean("enable_tax").default(true),
    enableFinanceGroups: boolean("enable_finance_groups").default(true),
    enableSettings: boolean("enable_settings").default(true),
    enableSystem: boolean("enable_system").default(true),
    // Reminder settings
    subscriptionReminderDays: integer("subscription_reminder_days").default(3),
    commitmentReminderDays: integer("commitment_reminder_days").default(3),
    taxReminderDays: integer("tax_reminder_days").default(30),
    // Budget threshold alerts
    budgetWarningThreshold: integer("budget_warning_threshold").default(80), // %
    budgetExceededThreshold: integer("budget_exceeded_threshold").default(100), // %
    // Goal milestone notifications
    goalMilestones: jsonb("goal_milestones").$type<number[]>().default([50, 75, 100]),
    // Email notifications (future)
    emailEnabled: boolean("email_enabled").default(false),
    emailDigestFrequency: varchar("email_digest_frequency", { length: 20 }).default("none"), // 'none', 'daily', 'weekly', 'monthly'
    // Push notifications (future)
    pushEnabled: boolean("push_enabled").default(false),
    // Quiet hours
    quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM format
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM format
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Notification Activity Log - Detailed audit trail
export const notificationActivityLog = pgTable(
  "notification_activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .references(() => notifications.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Activity details
    action: varchar("action", { length: 30 }).notNull(), // 'created', 'read', 'dismissed', 'clicked', 'expired'
    // Context
    deviceType: varchar("device_type", { length: 30 }),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    // Timestamp
    performedAt: timestamp("performed_at").defaultNow(),
  },
  (table) => ({
    notificationIdx: index("notification_activity_log_notification_idx").on(table.notificationId),
    userIdx: index("notification_activity_log_user_idx").on(table.userId),
    actionIdx: index("notification_activity_log_action_idx").on(table.action),
  })
);

// ============================================
// FORECASTING & PREDICTIONS
// ============================================

// Spending Forecasts - AI-powered predictions
export const spendingForecasts = pgTable(
  "spending_forecasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Forecast period
    forecastMonth: integer("forecast_month").notNull(),
    forecastYear: integer("forecast_year").notNull(),
    // Predicted values
    predictedTotalSpending: decimal("predicted_total_spending", { precision: 14, scale: 2 }),
    predictedTotalIncome: decimal("predicted_total_income", { precision: 14, scale: 2 }),
    predictedNetCashflow: decimal("predicted_net_cashflow", { precision: 14, scale: 2 }),
    predictedSavingsRate: decimal("predicted_savings_rate", { precision: 5, scale: 2 }),
    // Category-level predictions
    categoryPredictions: jsonb("category_predictions").$type<Array<{
      categoryId: string;
      categoryName: string;
      predictedAmount: number;
      confidence: number;
      trend: "up" | "down" | "stable";
    }>>(),
    // Confidence and accuracy
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }), // 0-100
    modelVersion: varchar("model_version", { length: 50 }),
    // Alerts and insights
    alerts: jsonb("alerts").$type<Array<{
      type: "overspending" | "budget_breach" | "goal_risk" | "opportunity";
      severity: "low" | "medium" | "high";
      message: string;
      categoryId?: string;
    }>>(),
    // Actual values (filled when month passes)
    actualTotalSpending: decimal("actual_total_spending", { precision: 14, scale: 2 }),
    actualTotalIncome: decimal("actual_total_income", { precision: 14, scale: 2 }),
    forecastAccuracy: decimal("forecast_accuracy", { precision: 5, scale: 2 }),
    // Metadata
    generatedAt: timestamp("generated_at").defaultNow(),
    validUntil: timestamp("valid_until"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userForecastIdx: index("spending_forecasts_user_idx").on(table.userId, table.forecastYear, table.forecastMonth),
    groupForecastIdx: index("spending_forecasts_group_idx").on(table.financeGroupId, table.forecastYear, table.forecastMonth),
  })
);

// System Time Settings - For managing timezone and date overrides
export const systemTimeSettings = pgTable(
  "system_time_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    // Timezone settings
    timezone: varchar("timezone", { length: 50 }).default("Asia/Kuala_Lumpur"),
    dateFormat: varchar("date_format", { length: 20 }).default("DD/MM/YYYY"),
    timeFormat: varchar("time_format", { length: 10 }).default("24h"), // '12h' or '24h'
    weekStartsOn: integer("week_starts_on").default(1), // 0=Sunday, 1=Monday
    // Override settings (for testing/debugging)
    useSystemTime: boolean("use_system_time").default(true),
    overrideDate: date("override_date"), // If set, use this instead of system date
    overrideTime: varchar("override_time", { length: 8 }), // HH:MM:SS format
    // Financial calendar settings
    monthlyResetDay: integer("monthly_reset_day").default(1), // Day of month when budgets reset
    financialYearStartMonth: integer("financial_year_start_month").default(1), // 1=January, 4=April (UK), etc.
    // Tracking preferences
    trackTransactionTime: boolean("track_transaction_time").default(true),
    trackTransactionLocation: boolean("track_transaction_location").default(false),
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Data Collection Events - For analytics and forecasting
export const dataCollectionEvents = pgTable(
  "data_collection_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    financeGroupId: uuid("finance_group_id")
      .references(() => financeGroups.id, { onDelete: "cascade" }),
    // Event details
    eventType: varchar("event_type", { length: 50 }).notNull(), // 'transaction', 'budget_update', 'goal_progress', etc.
    eventSubtype: varchar("event_subtype", { length: 50 }),
    entityType: varchar("entity_type", { length: 50 }), // 'transaction', 'budget', 'goal', etc.
    entityId: uuid("entity_id"),
    // Contextual data
    amount: decimal("amount", { precision: 14, scale: 2 }),
    categoryId: uuid("category_id"),
    vendorId: uuid("vendor_id"),
    // Time tracking (using system clock)
    eventTimestamp: timestamp("event_timestamp").defaultNow(),
    localTimestamp: timestamp("local_timestamp"), // User's local time
    dayOfWeek: integer("day_of_week"), // 0-6
    hourOfDay: integer("hour_of_day"), // 0-23
    weekOfYear: integer("week_of_year"),
    isWeekend: boolean("is_weekend"),
    isHoliday: boolean("is_holiday"),
    // Device/session info
    deviceType: varchar("device_type", { length: 50 }),
    sessionId: varchar("session_id", { length: 100 }),
    // Additional metadata
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userEventIdx: index("data_collection_user_idx").on(table.userId, table.eventTimestamp),
    typeIdx: index("data_collection_type_idx").on(table.eventType),
  })
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many, one }) => ({
  transactions: many(transactions),
  categories: many(categories),
  vendors: many(vendors),
  subscriptions: many(subscriptions),
  goals: many(goals),
  budgets: many(budgets),
  documents: many(documents),
  taxDeductions: many(taxDeductions),
  achievements: many(achievements),
  settings: one(userSettings),
  commitments: many(commitments),
  taxYears: many(taxYears),
  monthlyPcbRecords: many(monthlyPcbRecords),
  notifications: many(notifications),
  notificationPreferences: one(notificationPreferences),
  creditCards: many(creditCards),
}));

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  triggeredBy: one(users, {
    fields: [notifications.triggeredByUserId],
    references: [users.id],
    relationName: "triggeredNotifications",
  }),
  activityLog: many(notificationActivityLog),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const notificationActivityLogRelations = relations(notificationActivityLog, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationActivityLog.notificationId],
    references: [notifications.id],
  }),
  user: one(users, {
    fields: [notificationActivityLog.userId],
    references: [users.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [vendors.categoryId],
    references: [categories.id],
  }),
  taxDeductions: many(taxDeductions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
  commitments: many(commitments),
  familyExpenses: many(familyExpenses),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  creditCard: one(creditCards, {
    fields: [transactions.creditCardId],
    references: [creditCards.id],
  }),
}));

// Credit Card Relations
export const creditCardsRelations = relations(creditCards, ({ one, many }) => ({
  user: one(users, {
    fields: [creditCards.userId],
    references: [users.id],
  }),
  financeGroup: one(financeGroups, {
    fields: [creditCards.financeGroupId],
    references: [financeGroups.id],
  }),
  statements: many(creditCardStatements),
  transactions: many(transactions),
}));

export const creditCardStatementsRelations = relations(creditCardStatements, ({ one }) => ({
  creditCard: one(creditCards, {
    fields: [creditCardStatements.creditCardId],
    references: [creditCards.id],
  }),
  user: one(users, {
    fields: [creditCardStatements.userId],
    references: [users.id],
  }),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  primaryUser: one(users, {
    fields: [households.primaryUserId],
    references: [users.id],
  }),
  members: many(householdMembers),
  invites: many(householdInvites),
  familyExpenses: many(familyExpenses),
  commitments: many(commitments),
  taxYears: many(taxYears),
}));

export const householdMembersRelations = relations(householdMembers, ({ one, many }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
  familyExpenses: many(familyExpenses),
  taxDeductions: many(taxDeductions),
}));

export const householdInvitesRelations = relations(householdInvites, ({ one }) => ({
  household: one(households, {
    fields: [householdInvites.householdId],
    references: [households.id],
  }),
  invitedBy: one(users, {
    fields: [householdInvites.invitedByUserId],
    references: [users.id],
  }),
}));

export const familyExpensesRelations = relations(familyExpenses, ({ one }) => ({
  household: one(households, {
    fields: [familyExpenses.householdId],
    references: [households.id],
  }),
  recordedBy: one(users, {
    fields: [familyExpenses.recordedByUserId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [familyExpenses.categoryId],
    references: [categories.id],
  }),
  member: one(householdMembers, {
    fields: [familyExpenses.memberId],
    references: [householdMembers.id],
  }),
}));

export const commitmentsRelations = relations(commitments, ({ one, many }) => ({
  user: one(users, {
    fields: [commitments.userId],
    references: [users.id],
  }),
  household: one(households, {
    fields: [commitments.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [commitments.categoryId],
    references: [categories.id],
  }),
  subscription: one(subscriptions, {
    fields: [commitments.subscriptionId],
    references: [subscriptions.id],
  }),
  payments: many(commitmentPayments),
}));

export const commitmentPaymentsRelations = relations(commitmentPayments, ({ one }) => ({
  commitment: one(commitments, {
    fields: [commitmentPayments.commitmentId],
    references: [commitments.id],
  }),
  user: one(users, {
    fields: [commitmentPayments.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [commitmentPayments.transactionId],
    references: [transactions.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [subscriptions.categoryId],
    references: [categories.id],
  }),
  payments: many(subscriptionPayments),
  commitment: many(commitments),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionPayments.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [subscriptionPayments.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [subscriptionPayments.transactionId],
    references: [transactions.id],
  }),
}));

export const taxDeductionsRelations = relations(taxDeductions, ({ one }) => ({
  user: one(users, {
    fields: [taxDeductions.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [taxDeductions.transactionId],
    references: [transactions.id],
  }),
  taxYear: one(taxYears, {
    fields: [taxDeductions.taxYearId],
    references: [taxYears.id],
  }),
  lhdnCategory: one(lhdnReliefCategories, {
    fields: [taxDeductions.lhdnCategoryId],
    references: [lhdnReliefCategories.id],
  }),
  householdMember: one(householdMembers, {
    fields: [taxDeductions.householdMemberId],
    references: [householdMembers.id],
  }),
  vendor: one(vendors, {
    fields: [taxDeductions.vendorId],
    references: [vendors.id],
  }),
}));

export const taxYearsRelations = relations(taxYears, ({ one, many }) => ({
  user: one(users, {
    fields: [taxYears.userId],
    references: [users.id],
  }),
  household: one(households, {
    fields: [taxYears.householdId],
    references: [households.id],
  }),
  deductions: many(taxDeductions),
  pcbRecords: many(monthlyPcbRecords),
}));

export const monthlyPcbRecordsRelations = relations(monthlyPcbRecords, ({ one }) => ({
  user: one(users, {
    fields: [monthlyPcbRecords.userId],
    references: [users.id],
  }),
  taxYear: one(taxYears, {
    fields: [monthlyPcbRecords.taxYearId],
    references: [taxYears.id],
  }),
}));

export const lhdnReliefCategoriesRelations = relations(lhdnReliefCategories, ({ many }) => ({
  taxDeductions: many(taxDeductions),
}));

// Finance Groups Relations
export const financeGroupsRelations = relations(financeGroups, ({ one, many }) => ({
  owner: one(users, {
    fields: [financeGroups.ownerId],
    references: [users.id],
  }),
  members: many(financeGroupMembers),
  invites: many(financeGroupInvites),
  activities: many(financeGroupActivity),
  spendingPatterns: many(spendingPatterns),
  categories: many(categories),
  transactions: many(transactions),
  vendors: many(vendors),
  subscriptions: many(subscriptions),
  goals: many(goals),
  budgets: many(budgets),
  commitments: many(commitments),
}));

export const financeGroupMembersRelations = relations(financeGroupMembers, ({ one }) => ({
  financeGroup: one(financeGroups, {
    fields: [financeGroupMembers.financeGroupId],
    references: [financeGroups.id],
  }),
  user: one(users, {
    fields: [financeGroupMembers.userId],
    references: [users.id],
  }),
}));

export const financeGroupInvitesRelations = relations(financeGroupInvites, ({ one }) => ({
  financeGroup: one(financeGroups, {
    fields: [financeGroupInvites.financeGroupId],
    references: [financeGroups.id],
  }),
  invitedBy: one(users, {
    fields: [financeGroupInvites.invitedByUserId],
    references: [users.id],
  }),
}));

export const financeGroupActivityRelations = relations(financeGroupActivity, ({ one }) => ({
  financeGroup: one(financeGroups, {
    fields: [financeGroupActivity.financeGroupId],
    references: [financeGroups.id],
  }),
  user: one(users, {
    fields: [financeGroupActivity.userId],
    references: [users.id],
  }),
}));

export const spendingPatternsRelations = relations(spendingPatterns, ({ one }) => ({
  financeGroup: one(financeGroups, {
    fields: [spendingPatterns.financeGroupId],
    references: [financeGroups.id],
  }),
  user: one(users, {
    fields: [spendingPatterns.userId],
    references: [users.id],
  }),
}));

// ============================================
// AI ASSISTANT (BETA)
// ============================================

// AI Settings - Configuration for AI assistant per user
export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Feature Toggle
  aiEnabled: boolean("ai_enabled").default(false),
  
  // AI Provider Configuration
  provider: varchar("provider", { length: 50 }).default("azure_foundry"), // 'azure_foundry', 'openai', 'anthropic'
  modelEndpoint: text("model_endpoint"),
  modelName: varchar("model_name", { length: 100 }),
  apiKeyEncrypted: text("api_key_encrypted"), // AES-256 encrypted
  
  // Model Settings
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: integer("max_tokens").default(2048),
  
  // RAG Settings
  enableCrag: boolean("enable_crag").default(true),
  relevanceThreshold: decimal("relevance_threshold", { precision: 3, scale: 2 }).default("0.7"),
  maxRetrievalDocs: integer("max_retrieval_docs").default(10),
  enableWebSearchFallback: boolean("enable_web_search_fallback").default(false),
  
  // Data Access Permissions - What data AI can read
  dataAccess: jsonb("data_access").$type<{
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    subscriptions: boolean;
    creditCards: boolean;
    taxData: boolean;
    income: boolean;
    forecasts: boolean;
  }>().default({
    transactions: true,
    budgets: true,
    goals: true,
    subscriptions: true,
    creditCards: true,
    taxData: true,
    income: true,
    forecasts: true,
  }),
  
  // Privacy Settings
  anonymizeVendors: boolean("anonymize_vendors").default(false),
  excludeSensitiveCategories: jsonb("exclude_sensitive_categories").$type<string[]>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Conversations - Chat history sessions
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  title: varchar("title", { length: 255 }),
  
  // Metadata
  totalMessages: integer("total_messages").default(0),
  totalTokensUsed: integer("total_tokens_used").default(0),
  
  // Status
  isArchived: boolean("is_archived").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ai_conversations_user_id_idx").on(table.userId),
}));

// AI Messages - Individual messages in conversations
export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => aiConversations.id, { onDelete: "cascade" })
    .notNull(),
  
  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  
  // RAG Metadata (for transparency - show user what data was analyzed)
  retrievedData: jsonb("retrieved_data").$type<{
    tables: string[];
    recordCount: number;
    dateRange?: { start: string; end: string };
    summary?: string;
  }>(),
  dataSources: jsonb("data_sources").$type<string[]>(), // Which retrievers were used
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  
  // Processing metadata
  tokensUsed: integer("tokens_used"),
  processingTimeMs: integer("processing_time_ms"),
  
  // CRAG metadata
  queryRewritten: boolean("query_rewritten").default(false),
  originalQuery: text("original_query"),
  relevanceGrades: jsonb("relevance_grades").$type<{ source: string; score: number }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdIdx: index("ai_messages_conversation_id_idx").on(table.conversationId),
}));

// AI Insights Cache - Precomputed insights for faster responses
export const aiInsightsCache = pgTable("ai_insights_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  // Insight type and data
  insightType: varchar("insight_type", { length: 50 }).notNull(), // 'tax_savings', 'spending_pattern', 'budget_alert', 'goal_progress', 'subscription_audit'
  insightData: jsonb("insight_data").notNull(),
  
  // Human-readable summary
  summary: text("summary"),
  
  // Validity period
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  // Generation metadata
  generatedBy: varchar("generated_by", { length: 50 }), // 'scheduled', 'on_demand', 'triggered'
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ai_insights_cache_user_id_idx").on(table.userId),
  insightTypeIdx: index("ai_insights_cache_type_idx").on(table.insightType),
}));

// AI Settings Relations
export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  user: one(users, {
    fields: [aiSettings.userId],
    references: [users.id],
  }),
}));

// AI Conversations Relations
export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

// AI Messages Relations
export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

// AI Insights Cache Relations
export const aiInsightsCacheRelations = relations(aiInsightsCache, ({ one }) => ({
  user: one(users, {
    fields: [aiInsightsCache.userId],
    references: [users.id],
  }),
}));
