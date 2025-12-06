/**
 * Demo User Seed Script for Sharifah Azhar
 * 
 * Profile:
 * - Name: Sharifah Azhar
 * - Email: yuurimikasa@gmail.com
 * - Occupation: Vice President of IT, Maybank
 * - Location: Klang Valley, Malaysia
 * - Family: Married with 1 child
 * - Husband: Senior Manager at RHB Bank
 * 
 * Run with: npx tsx db/seed-demo-user.ts
 */

import { db } from "./index";
import {
  users,
  financeGroups,
  financeGroupMembers,
  categories,
  transactions,
  subscriptions,
  commitments,
  commitmentPayments,
  goals,
  budgets,
  creditCards,
  taxDeductions,
  userSettings,
  vendors,
  households,
  householdMembers,
} from "./schema";
import { eq } from "drizzle-orm";

// ============================================
// CONFIGURATION
// ============================================

const USER_EMAIL = "yuurimikasa@gmail.com";

// Sharifah Azhar's Profile
const USER_PROFILE = {
  name: "Sharifah Azhar",
  occupation: "Vice President, IT",
  employerName: "Maybank Berhad",
  employmentType: "employed" as const,
  salary: "35000", // RM 35,000/month
  annualIncome: "420000", // RM 420,000/year base
  currency: "MYR",
  maritalStatus: "married" as const,
  taxResidentStatus: "resident" as const,
  taxAssessmentType: "separate" as const, // Filing separately
  numberOfDependents: 1,
  dateOfBirth: "1982-03-15",
  phone: "+60 12-345 6789",
  address: "Bangsar South, Kuala Lumpur",
  icNumber: "820315-14-5678",
  taxFileNumber: "SG 12345678",
  epfNumber: "12345678",
};

// Husband's profile (for household)
const HUSBAND_PROFILE = {
  name: "Ahmad Razali",
  relationship: "spouse" as const,
  dateOfBirth: "1980-07-22",
  icNumber: "800722-14-1234",
  hasIncome: true,
  annualIncome: "216000", // RM 18,000/month x 12
};

// Child's profile
const CHILD_PROFILE = {
  name: "Nur Aisyah",
  relationship: "child" as const,
  dateOfBirth: "2018-09-10",
  isStudent: true,
  educationLevel: "primary" as const,
  hasIncome: false,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomAmount(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function getMonthlyDates(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// ============================================
// CATEGORIES DEFINITION
// ============================================

const EXPENSE_CATEGORIES = [
  { name: "Groceries", color: "#10B981", icon: "🛒", type: "expense", isTaxDeductible: false },
  { name: "Dining Out", color: "#F59E0B", icon: "🍽️", type: "expense", isTaxDeductible: false },
  { name: "Transport", color: "#3B82F6", icon: "🚗", type: "expense", isTaxDeductible: false },
  { name: "Petrol", color: "#6366F1", icon: "⛽", type: "expense", isTaxDeductible: false },
  { name: "Utilities", color: "#8B5CF6", icon: "💡", type: "expense", isTaxDeductible: false },
  { name: "Shopping", color: "#EC4899", icon: "🛍️", type: "expense", isTaxDeductible: false },
  { name: "Entertainment", color: "#14B8A6", icon: "🎬", type: "expense", isTaxDeductible: false },
  { name: "Healthcare", color: "#EF4444", icon: "🏥", type: "expense", isTaxDeductible: true, taxCategory: "self_medical" },
  { name: "Medical Insurance", color: "#DC2626", icon: "🩺", type: "expense", isTaxDeductible: true, taxCategory: "medical_insurance" },
  { name: "Life Insurance", color: "#B91C1C", icon: "🛡️", type: "expense", isTaxDeductible: true, taxCategory: "life_insurance" },
  { name: "Education", color: "#0EA5E9", icon: "📚", type: "expense", isTaxDeductible: true, taxCategory: "education_fees" },
  { name: "Child Education", color: "#0284C7", icon: "🎓", type: "expense", isTaxDeductible: true, taxCategory: "child_education" },
  { name: "EPF/KWSP", color: "#059669", icon: "🏦", type: "expense", isTaxDeductible: true, taxCategory: "epf" },
  { name: "SSPN", color: "#047857", icon: "💰", type: "expense", isTaxDeductible: true, taxCategory: "sspn" },
  { name: "Childcare", color: "#F472B6", icon: "👶", type: "expense", isTaxDeductible: true, taxCategory: "childcare" },
  { name: "Home & Living", color: "#A855F7", icon: "🏠", type: "expense", isTaxDeductible: false },
  { name: "Personal Care", color: "#E879F9", icon: "💄", type: "expense", isTaxDeductible: false },
  { name: "Subscription", color: "#22D3EE", icon: "📱", type: "expense", isTaxDeductible: false },
  { name: "Fitness", color: "#4ADE80", icon: "🏋️", type: "expense", isTaxDeductible: true, taxCategory: "lifestyle" },
  { name: "Travel", color: "#FBBF24", icon: "✈️", type: "expense", isTaxDeductible: false },
  { name: "Gifts & Donations", color: "#F87171", icon: "🎁", type: "expense", isTaxDeductible: true, taxCategory: "donations" },
  { name: "Mortgage", color: "#6B7280", icon: "🏘️", type: "expense", isTaxDeductible: false },
  { name: "Car Loan", color: "#9CA3AF", icon: "🚙", type: "expense", isTaxDeductible: false },
  { name: "Investment", color: "#84CC16", icon: "📈", type: "expense", isTaxDeductible: false },
];

const INCOME_CATEGORIES = [
  { name: "Salary", color: "#10B981", icon: "💼", type: "income", isTaxDeductible: false },
  { name: "Bonus", color: "#059669", icon: "🎉", type: "income", isTaxDeductible: false },
  { name: "Investment Returns", color: "#34D399", icon: "📈", type: "income", isTaxDeductible: false },
  { name: "Dividend", color: "#6EE7B7", icon: "💵", type: "income", isTaxDeductible: false },
  { name: "Rental Income", color: "#A7F3D0", icon: "🏠", type: "income", isTaxDeductible: false },
  { name: "Other Income", color: "#D1FAE5", icon: "💰", type: "income", isTaxDeductible: false },
];

// ============================================
// SUBSCRIPTIONS DATA
// ============================================

const SUBSCRIPTIONS_DATA = [
  { name: "Netflix", amount: "54.90", frequency: "monthly", icon: "🎬", category: "Subscription", startDate: "2021-01-15" },
  { name: "Spotify Family", amount: "22.40", frequency: "monthly", icon: "🎵", category: "Subscription", startDate: "2020-06-01" },
  { name: "Amazon Prime", amount: "14.90", frequency: "monthly", icon: "📦", category: "Subscription", startDate: "2022-03-10" },
  { name: "iCloud 200GB", amount: "12.90", frequency: "monthly", icon: "☁️", category: "Subscription", startDate: "2019-09-01" },
  { name: "YouTube Premium", amount: "23.90", frequency: "monthly", icon: "▶️", category: "Subscription", startDate: "2023-01-01" },
  { name: "ChatGPT Plus", amount: "95.00", frequency: "monthly", icon: "🤖", category: "Subscription", startDate: "2023-04-01" },
  { name: "Gym Membership (Celebrity Fitness)", amount: "188.00", frequency: "monthly", icon: "🏋️", category: "Fitness", startDate: "2022-01-01" },
  { name: "Unifi 500Mbps", amount: "199.00", frequency: "monthly", icon: "📶", category: "Utilities", startDate: "2020-01-01" },
  { name: "Astro Fibre", amount: "149.00", frequency: "monthly", icon: "📺", category: "Subscription", startDate: "2018-06-01" },
];

// ============================================
// COMMITMENTS DATA (Loans, Insurance, Bills)
// ============================================

const COMMITMENTS_DATA = [
  // Mortgage - Bangsar South Condo
  {
    name: "Maybank Home Loan - Bangsar South",
    commitmentType: "mortgage",
    amount: "4500.00",
    frequency: "monthly",
    dueDay: 15,
    payee: "Maybank Berhad",
    totalAmount: "850000.00",
    remainingAmount: "620000.00",
    interestRate: "4.15",
    startDate: "2019-03-01",
    endDate: "2049-03-01",
  },
  // Car Loan - Mercedes C200
  {
    name: "CIMB Car Loan - Mercedes C200",
    commitmentType: "car_loan",
    amount: "2800.00",
    frequency: "monthly",
    dueDay: 1,
    payee: "CIMB Bank Berhad",
    totalAmount: "220000.00",
    remainingAmount: "95000.00",
    interestRate: "3.28",
    startDate: "2021-06-01",
    endDate: "2028-06-01",
  },
  // Life Insurance
  {
    name: "Prudential PRULife",
    commitmentType: "insurance",
    amount: "450.00",
    frequency: "monthly",
    dueDay: 5,
    payee: "Prudential Assurance Malaysia",
    isTaxDeductible: true,
    taxCategory: "life_insurance",
  },
  // Medical Card
  {
    name: "AIA Medical Card A-Plus",
    commitmentType: "insurance",
    amount: "380.00",
    frequency: "monthly",
    dueDay: 10,
    payee: "AIA Bhd",
    isTaxDeductible: true,
    taxCategory: "medical_insurance",
  },
  // Car Insurance
  {
    name: "Allianz Car Insurance",
    commitmentType: "insurance",
    amount: "380.00",
    frequency: "yearly",
    dueDay: 1,
    payee: "Allianz General Insurance",
  },
  // TNB Electric
  {
    name: "TNB Electricity",
    commitmentType: "bill",
    amount: "350.00",
    frequency: "monthly",
    dueDay: 20,
    payee: "Tenaga Nasional Berhad",
  },
  // Water Bill
  {
    name: "Air Selangor",
    commitmentType: "bill",
    amount: "85.00",
    frequency: "monthly",
    dueDay: 25,
    payee: "Pengurusan Air Selangor",
  },
  // Indah Water
  {
    name: "Indah Water",
    commitmentType: "bill",
    amount: "8.00",
    frequency: "monthly",
    dueDay: 25,
    payee: "Indah Water Konsortium",
  },
  // SSPN for Child
  {
    name: "SSPN-i Plus - Nur Aisyah",
    commitmentType: "other",
    amount: "500.00",
    frequency: "monthly",
    dueDay: 1,
    payee: "PTPTN",
    isTaxDeductible: true,
    taxCategory: "sspn",
  },
  // Private School Fees
  {
    name: "Sri KDU International School",
    commitmentType: "bill",
    amount: "3200.00",
    frequency: "monthly",
    dueDay: 1,
    payee: "Sri KDU Schools",
    isTaxDeductible: true,
    taxCategory: "child_education",
  },
];

// ============================================
// GOALS DATA
// ============================================

const GOALS_DATA = [
  {
    name: "Emergency Fund",
    description: "6 months of household expenses",
    targetAmount: "200000.00",
    currentAmount: "145000.00",
    deadline: "2025-12-31",
    category: "emergency_fund",
    icon: "🛡️",
    color: "#10B981",
  },
  {
    name: "Nur Aisyah's University Fund",
    description: "Education fund for daughter's university",
    targetAmount: "500000.00",
    currentAmount: "85000.00",
    deadline: "2036-09-01",
    category: "education",
    icon: "🎓",
    color: "#3B82F6",
  },
  {
    name: "Property Investment - Johor",
    description: "Downpayment for investment property in Iskandar",
    targetAmount: "150000.00",
    currentAmount: "62000.00",
    deadline: "2026-06-30",
    category: "investment",
    icon: "🏠",
    color: "#8B5CF6",
  },
  {
    name: "Japan Family Trip 2025",
    description: "2-week family vacation to Tokyo & Osaka",
    targetAmount: "25000.00",
    currentAmount: "18500.00",
    deadline: "2025-04-01",
    category: "vacation",
    icon: "✈️",
    color: "#F59E0B",
  },
  {
    name: "Early Retirement Fund",
    description: "FIRE target - Financial Independence",
    targetAmount: "3000000.00",
    currentAmount: "450000.00",
    deadline: "2042-03-15",
    category: "retirement",
    icon: "🏖️",
    color: "#EC4899",
  },
];

// ============================================
// CREDIT CARDS DATA
// ============================================

const CREDIT_CARDS_DATA = [
  {
    bankName: "Maybank",
    cardType: "Visa",
    cardName: "Maybank Visa Infinite",
    cardColor: "gradient-gold",
    cardDesign: "premium",
    lastFourDigits: "4521",
    creditLimit: "80000.00",
    billingCycleDay: 15,
    paymentDueDay: 5,
    isPrimary: true,
  },
  {
    bankName: "CIMB Bank",
    cardType: "Mastercard",
    cardName: "CIMB Preferred World Mastercard",
    cardColor: "gradient-red",
    cardDesign: "modern",
    lastFourDigits: "8734",
    creditLimit: "50000.00",
    billingCycleDay: 20,
    paymentDueDay: 10,
    isPrimary: false,
  },
  {
    bankName: "HSBC Malaysia",
    cardType: "Visa",
    cardName: "HSBC Visa Signature",
    cardColor: "gradient-blue",
    cardDesign: "classic",
    lastFourDigits: "2198",
    creditLimit: "60000.00",
    billingCycleDay: 25,
    paymentDueDay: 15,
    isPrimary: false,
  },
];

// ============================================
// VENDORS DATA
// ============================================

const VENDORS_DATA = [
  { name: "Village Grocer", category: "Groceries", website: "https://villagegrocer.com.my" },
  { name: "Jaya Grocer", category: "Groceries", website: "https://jayagrocer.com" },
  { name: "Cold Storage", category: "Groceries", website: "https://coldstorage.com.my" },
  { name: "AEON", category: "Shopping", website: "https://aeonretail.com.my" },
  { name: "Pavilion KL", category: "Shopping", website: "https://pavilion-kl.com" },
  { name: "Shell", category: "Petrol", website: "https://shell.com.my" },
  { name: "Petronas", category: "Petrol", website: "https://petronas.com.my" },
  { name: "Grab", category: "Transport", website: "https://grab.com" },
  { name: "Din Tai Fung", category: "Dining Out", website: "https://dintaifung.com.my" },
  { name: "Nando's", category: "Dining Out", website: "https://nandos.com.my" },
  { name: "Starbucks", category: "Dining Out", website: "https://starbucks.com.my" },
  { name: "Guardian", category: "Healthcare", website: "https://guardian.com.my" },
  { name: "Watsons", category: "Personal Care", website: "https://watsons.com.my" },
  { name: "Popular Bookstore", category: "Education", website: "https://popular.com.my" },
  { name: "GSC Cinemas", category: "Entertainment", website: "https://gsc.com.my" },
  { name: "TGV Cinemas", category: "Entertainment", website: "https://tgv.com.my" },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedDemoUser() {
  console.log("🌱 Starting demo user seed for Sharifah Azhar...\n");

  try {
    // Step 1: Find or create user
    console.log("1️⃣ Finding user...");
    let user = await db.query.users.findFirst({
      where: eq(users.email, USER_EMAIL),
    });

    if (!user) {
      console.log("   User not found. Creating new user...");
      const [newUser] = await db
        .insert(users)
        .values({
          email: USER_EMAIL,
          ...USER_PROFILE,
        })
        .returning();
      user = newUser;
      console.log(`   ✅ Created user: ${user.name} (${user.id})`);
    } else {
      // Update existing user with full profile
      console.log("   User found. Updating profile...");
      await db
        .update(users)
        .set({
          ...USER_PROFILE,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      console.log(`   ✅ Updated user: ${user.name} (${user.id})`);
    }

    const userId = user.id;

    // Step 2: Create/Update User Settings
    console.log("\n2️⃣ Setting up user settings...");
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!existingSettings) {
      await db.insert(userSettings).values({
        userId,
        theme: "dark",
        language: "en",
        notifications: {
          email: true,
          push: true,
          budgetAlerts: true,
          billReminders: true,
          goalMilestones: true,
          commitmentReminders: true,
          taxDeadlines: true,
        },
        dashboardWidgets: ["spending", "income", "goals", "budgets", "commitments"],
      });
    }
    console.log("   ✅ User settings configured");

    // Step 3: Create Finance Group
    console.log("\n3️⃣ Creating finance group...");
    let financeGroup = await db.query.financeGroups.findFirst({
      where: eq(financeGroups.ownerId, userId),
    });

    if (!financeGroup) {
      const [newGroup] = await db
        .insert(financeGroups)
        .values({
          ownerId: userId,
          name: "Sharifah's Family Finance",
          description: "Personal and family financial management",
          type: "family",
          icon: "👨‍👩‍👧",
          color: "#8B5CF6",
          currency: "MYR",
          isDefault: true,
          isActive: true,
          enableForecasting: true,
          forecastingPeriod: 12,
        })
        .returning();
      financeGroup = newGroup;

      // Add user as owner member
      await db.insert(financeGroupMembers).values({
        financeGroupId: financeGroup.id,
        userId,
        role: "owner",
        relationship: "self",
        status: "active",
        permissions: {
          viewTransactions: true,
          editTransactions: true,
          viewBudgets: true,
          editBudgets: true,
          viewGoals: true,
          editGoals: true,
          viewTax: true,
          editTax: true,
          viewCommitments: true,
          editCommitments: true,
          viewReports: true,
          exportData: true,
          inviteMembers: true,
          manageMembers: true,
        },
      });
    }
    console.log(`   ✅ Finance group: ${financeGroup.name} (${financeGroup.id})`);

    const financeGroupId = financeGroup.id;

    // Step 4: Create Household
    console.log("\n4️⃣ Creating household...");
    let household = await db.query.households.findFirst({
      where: eq(households.primaryUserId, userId),
    });

    if (!household) {
      const [newHousehold] = await db
        .insert(households)
        .values({
          name: "The Azhar-Razali Family",
          primaryUserId: userId,
          taxFilingType: "separate",
          fiscalYear: 2024,
          totalHouseholdIncome: "636000", // Combined annual income
          currency: "MYR",
        })
        .returning();
      household = newHousehold;

      // Add husband as household member
      await db.insert(householdMembers).values({
        householdId: household.id,
        ...HUSBAND_PROFILE,
      });

      // Add child as household member
      await db.insert(householdMembers).values({
        householdId: household.id,
        ...CHILD_PROFILE,
      });
    }
    console.log(`   ✅ Household: ${household.name}`);

    // Step 5: Create Categories
    console.log("\n5️⃣ Creating categories...");
    
    // Delete existing categories for this user
    await db.delete(categories).where(eq(categories.userId, userId));

    const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    const categoryMap: Record<string, string> = {};

    for (const cat of allCategories) {
      const [newCat] = await db
        .insert(categories)
        .values({
          userId,
          financeGroupId,
          ...cat,
          isSystem: true,
        })
        .returning();
      categoryMap[cat.name] = newCat.id;
    }
    console.log(`   ✅ Created ${allCategories.length} categories`);

    // Step 6: Create Vendors
    console.log("\n6️⃣ Creating vendors...");
    
    // Delete existing vendors
    await db.delete(vendors).where(eq(vendors.userId, userId));

    const vendorMap: Record<string, string> = {};
    for (const vendor of VENDORS_DATA) {
      const [newVendor] = await db
        .insert(vendors)
        .values({
          userId,
          financeGroupId,
          name: vendor.name,
          categoryId: categoryMap[vendor.category] || null,
          website: vendor.website,
        })
        .returning();
      vendorMap[vendor.name] = newVendor.id;
    }
    console.log(`   ✅ Created ${VENDORS_DATA.length} vendors`);

    // Step 7: Create Credit Cards
    console.log("\n7️⃣ Creating credit cards...");
    
    // Delete existing credit cards
    await db.delete(creditCards).where(eq(creditCards.userId, userId));

    const creditCardMap: Record<string, string> = {};
    for (const card of CREDIT_CARDS_DATA) {
      const [newCard] = await db
        .insert(creditCards)
        .values({
          userId,
          financeGroupId,
          ...card,
          isActive: true,
        })
        .returning();
      creditCardMap[card.cardName] = newCard.id;
    }
    console.log(`   ✅ Created ${CREDIT_CARDS_DATA.length} credit cards`);

    // Step 8: Create Subscriptions
    console.log("\n8️⃣ Creating subscriptions...");
    
    // Delete existing subscriptions
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));

    for (const sub of SUBSCRIPTIONS_DATA) {
      const startDate = new Date(sub.startDate);
      const nextBilling = new Date();
      nextBilling.setDate(startDate.getDate());
      if (nextBilling < new Date()) {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }

      await db.insert(subscriptions).values({
        userId,
        financeGroupId,
        categoryId: categoryMap[sub.category] || categoryMap["Subscription"],
        name: sub.name,
        amount: sub.amount,
        frequency: sub.frequency,
        startDate,
        nextBillingDate: nextBilling,
        isActive: true,
        icon: sub.icon,
        paymentMethod: "credit_card",
        creditCardId: creditCardMap["Maybank Visa Infinite"],
      });
    }
    console.log(`   ✅ Created ${SUBSCRIPTIONS_DATA.length} subscriptions`);

    // Step 9: Create Commitments
    console.log("\n9️⃣ Creating commitments...");
    
    // Delete existing commitments and payments
    const existingCommitments = await db.query.commitments.findMany({
      where: eq(commitments.userId, userId),
    });
    for (const c of existingCommitments) {
      await db.delete(commitmentPayments).where(eq(commitmentPayments.commitmentId, c.id));
    }
    await db.delete(commitments).where(eq(commitments.userId, userId));

    const commitmentIds: Record<string, string> = {};
    for (const comm of COMMITMENTS_DATA) {
      const startDate = comm.startDate ? new Date(comm.startDate) : new Date("2020-01-01");
      const nextDue = new Date();
      nextDue.setDate(comm.dueDay || 1);
      if (nextDue < new Date()) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      const [newCommitment] = await db
        .insert(commitments)
        .values({
          userId,
          financeGroupId,
          name: comm.name,
          commitmentType: comm.commitmentType,
          amount: comm.amount,
          frequency: comm.frequency,
          dueDay: comm.dueDay,
          startDate,
          endDate: comm.endDate ? new Date(comm.endDate) : null,
          nextDueDate: nextDue,
          payee: comm.payee,
          totalAmount: comm.totalAmount,
          remainingAmount: comm.remainingAmount,
          interestRate: comm.interestRate,
          isActive: true,
          isPriority: comm.commitmentType === "mortgage" || comm.commitmentType === "car_loan",
          reminderEnabled: true,
          reminderDaysBefore: 3,
          isTaxDeductible: comm.isTaxDeductible || false,
          taxCategory: comm.taxCategory,
          paymentMethod: "bank_debit",
        })
        .returning();
      
      commitmentIds[comm.name] = newCommitment.id;

      // Create payment history for past months
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const paymentDate = new Date(now.getFullYear(), now.getMonth() - i, comm.dueDay || 1);
        if (paymentDate >= startDate && paymentDate <= now) {
          await db.insert(commitmentPayments).values({
            commitmentId: newCommitment.id,
            userId,
            year: paymentDate.getFullYear(),
            month: paymentDate.getMonth() + 1,
            dueDate: paymentDate,
            status: i === 0 ? "pending" : "paid",
            isPaid: i !== 0,
            paidAt: i !== 0 ? new Date(paymentDate.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
            paidAmount: i !== 0 ? comm.amount : null,
            paymentMethod: "bank_debit",
          });
        }
      }
    }
    console.log(`   ✅ Created ${COMMITMENTS_DATA.length} commitments with payment history`);

    // Step 10: Create Goals
    console.log("\n🔟 Creating goals...");
    
    // Delete existing goals
    await db.delete(goals).where(eq(goals.userId, userId));

    for (const goal of GOALS_DATA) {
      await db.insert(goals).values({
        userId,
        financeGroupId,
        name: goal.name,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: new Date(goal.deadline),
        category: goal.category,
        icon: goal.icon,
        color: goal.color,
        isCompleted: false,
      });
    }
    console.log(`   ✅ Created ${GOALS_DATA.length} goals`);

    // Step 11: Create Budgets
    console.log("\n1️⃣1️⃣ Creating budgets...");
    
    // Delete existing budgets
    await db.delete(budgets).where(eq(budgets.userId, userId));

    const budgetItems = [
      { category: "Groceries", amount: "2500" },
      { category: "Dining Out", amount: "2000" },
      { category: "Transport", amount: "500" },
      { category: "Petrol", amount: "800" },
      { category: "Shopping", amount: "3000" },
      { category: "Entertainment", amount: "1000" },
      { category: "Healthcare", amount: "500" },
      { category: "Personal Care", amount: "500" },
      { category: "Travel", amount: "2000" },
      { category: "Gifts & Donations", amount: "500" },
    ];

    for (const budget of budgetItems) {
      await db.insert(budgets).values({
        userId,
        financeGroupId,
        categoryId: categoryMap[budget.category],
        amount: budget.amount,
        period: "monthly",
        startDate: new Date("2024-01-01"),
        alertThreshold: 80,
      });
    }
    console.log(`   ✅ Created ${budgetItems.length} budgets`);

    // Step 12: Create Transactions (2023-2025)
    console.log("\n1️⃣2️⃣ Creating transactions (2023-2025)...");
    
    // Delete existing transactions
    await db.delete(transactions).where(eq(transactions.userId, userId));

    let transactionCount = 0;

    // Generate transactions for each month from Jan 2023 to Dec 2025
    for (let year = 2023; year <= 2025; year++) {
      const endMonth = year === 2025 ? 12 : 12;
      
      for (let month = 1; month <= endMonth; month++) {
        // Skip future months
        const currentDate = new Date();
        if (year > currentDate.getFullYear() || (year === currentDate.getFullYear() && month > currentDate.getMonth() + 1)) {
          continue;
        }

        // Monthly Salary Income (25th of each month)
        await db.insert(transactions).values({
          userId,
          financeGroupId,
          categoryId: categoryMap["Salary"],
          amount: "35000.00",
          type: "income",
          incomeType: "salary",
          incomeMonth: month,
          incomeYear: year,
          description: "Monthly Salary - Maybank Berhad",
          date: getMonthlyDates(year, month, 25),
          vendor: "Maybank Berhad",
          paymentMethod: "bank_transfer",
        });
        transactionCount++;

        // Bonus in March and December
        if (month === 3) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Bonus"],
            amount: year === 2024 ? "52500.00" : "45000.00", // Performance bonus
            type: "income",
            incomeType: "bonus",
            incomeMonth: month,
            incomeYear: year,
            description: "Annual Performance Bonus",
            date: getMonthlyDates(year, month, 15),
            vendor: "Maybank Berhad",
            paymentMethod: "bank_transfer",
          });
          transactionCount++;
        }

        if (month === 12) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Bonus"],
            amount: "35000.00", // Year-end bonus
            type: "income",
            incomeType: "bonus",
            incomeMonth: month,
            incomeYear: year,
            description: "Year-End Bonus",
            date: getMonthlyDates(year, month, 20),
            vendor: "Maybank Berhad",
            paymentMethod: "bank_transfer",
          });
          transactionCount++;
        }

        // Dividend income (quarterly)
        if ([3, 6, 9, 12].includes(month)) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Dividend"],
            amount: getRandomAmount(800, 2500),
            type: "income",
            incomeType: "investment",
            incomeMonth: month,
            incomeYear: year,
            description: "ASB/ASM Dividend",
            date: getMonthlyDates(year, month, 28),
            vendor: "Amanah Saham Nasional Berhad",
            paymentMethod: "bank_transfer",
          });
          transactionCount++;
        }

        // Monthly Expenses

        // Groceries (4-6 times per month)
        const groceryVendors = ["Village Grocer", "Jaya Grocer", "Cold Storage", "AEON"];
        for (let i = 0; i < 5; i++) {
          const vendor = groceryVendors[Math.floor(Math.random() * groceryVendors.length)];
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Groceries"],
            amount: getRandomAmount(150, 450),
            type: "expense",
            description: `Weekly groceries`,
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor,
            vendorId: vendorMap[vendor],
            paymentMethod: Math.random() > 0.5 ? "credit_card" : "tng_ewallet",
            creditCardId: Math.random() > 0.5 ? creditCardMap["Maybank Visa Infinite"] : null,
          });
          transactionCount++;
        }

        // Dining Out (8-12 times per month)
        const diningVendors = ["Din Tai Fung", "Nando's", "Starbucks"];
        for (let i = 0; i < 10; i++) {
          const vendor = diningVendors[Math.floor(Math.random() * diningVendors.length)];
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Dining Out"],
            amount: getRandomAmount(30, 250),
            type: "expense",
            description: vendor === "Starbucks" ? "Coffee" : "Family dining",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor,
            vendorId: vendorMap[vendor],
            paymentMethod: "credit_card",
            creditCardId: creditCardMap["Maybank Visa Infinite"],
          });
          transactionCount++;
        }

        // Petrol (4 times per month)
        const petrolVendors = ["Shell", "Petronas"];
        for (let i = 0; i < 4; i++) {
          const vendor = petrolVendors[Math.floor(Math.random() * petrolVendors.length)];
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Petrol"],
            amount: getRandomAmount(150, 250),
            type: "expense",
            description: "Fuel - Mercedes C200",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor,
            vendorId: vendorMap[vendor],
            paymentMethod: "credit_card",
            creditCardId: creditCardMap["CIMB Preferred World Mastercard"],
          });
          transactionCount++;
        }

        // Grab rides (occasional)
        for (let i = 0; i < 3; i++) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Transport"],
            amount: getRandomAmount(15, 65),
            type: "expense",
            description: "Grab ride",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: "Grab",
            vendorId: vendorMap["Grab"],
            paymentMethod: "grabpay",
          });
          transactionCount++;
        }

        // Shopping (2-4 times per month)
        for (let i = 0; i < 3; i++) {
          const vendor = Math.random() > 0.5 ? "Pavilion KL" : "AEON";
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Shopping"],
            amount: getRandomAmount(100, 800),
            type: "expense",
            description: "Shopping",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor,
            vendorId: vendorMap[vendor],
            paymentMethod: "credit_card",
            creditCardId: creditCardMap["Maybank Visa Infinite"],
          });
          transactionCount++;
        }

        // Entertainment (movies, etc.)
        if (Math.random() > 0.3) {
          const cinema = Math.random() > 0.5 ? "GSC Cinemas" : "TGV Cinemas";
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Entertainment"],
            amount: getRandomAmount(50, 120),
            type: "expense",
            description: "Movie tickets",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: cinema,
            vendorId: vendorMap[cinema],
            paymentMethod: "credit_card",
            creditCardId: creditCardMap["Maybank Visa Infinite"],
          });
          transactionCount++;
        }

        // Healthcare (occasional)
        if (Math.random() > 0.7) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Healthcare"],
            amount: getRandomAmount(50, 300),
            type: "expense",
            description: "Medical checkup/pharmacy",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: "Guardian",
            vendorId: vendorMap["Guardian"],
            paymentMethod: "credit_card",
            isTaxDeductible: true,
            taxCategory: "self_medical",
          });
          transactionCount++;
        }

        // Personal Care
        await db.insert(transactions).values({
          userId,
          financeGroupId,
          categoryId: categoryMap["Personal Care"],
          amount: getRandomAmount(50, 200),
          type: "expense",
          description: "Personal care products",
          date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
          vendor: "Watsons",
          vendorId: vendorMap["Watsons"],
          paymentMethod: "credit_card",
        });
        transactionCount++;

        // Books/Education for child
        if (Math.random() > 0.5) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Education"],
            amount: getRandomAmount(30, 150),
            type: "expense",
            description: "Books and educational materials",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: "Popular Bookstore",
            vendorId: vendorMap["Popular Bookstore"],
            paymentMethod: "credit_card",
            isTaxDeductible: true,
            taxCategory: "education_fees",
          });
          transactionCount++;
        }

        // EPF contribution (automatic from salary)
        await db.insert(transactions).values({
          userId,
          financeGroupId,
          categoryId: categoryMap["EPF/KWSP"],
          amount: "3850.00", // 11% of RM35,000
          type: "expense",
          description: "EPF Employee Contribution",
          date: getMonthlyDates(year, month, 25),
          vendor: "KWSP",
          paymentMethod: "bank_debit",
          isTaxDeductible: true,
          taxCategory: "epf",
        });
        transactionCount++;

        // Annual travel expenses
        if ((month === 4 || month === 8 || month === 12) && Math.random() > 0.3) {
          const travelAmount = month === 12 ? getRandomAmount(5000, 12000) : getRandomAmount(1500, 4000);
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Travel"],
            amount: travelAmount,
            type: "expense",
            description: month === 12 ? "Year-end family vacation" : "Weekend getaway",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: "Agoda/AirAsia",
            paymentMethod: "credit_card",
            creditCardId: creditCardMap["HSBC Visa Signature"],
          });
          transactionCount++;
        }

        // Donations (occasional)
        if (Math.random() > 0.8) {
          await db.insert(transactions).values({
            userId,
            financeGroupId,
            categoryId: categoryMap["Gifts & Donations"],
            amount: getRandomAmount(100, 500),
            type: "expense",
            description: "Charitable donation",
            date: randomDate(getMonthlyDates(year, month, 1), getMonthlyDates(year, month, 28)),
            vendor: "Various charities",
            paymentMethod: "bank_transfer",
            isTaxDeductible: true,
            taxCategory: "donations",
          });
          transactionCount++;
        }
      }
    }
    console.log(`   ✅ Created ${transactionCount} transactions`);

    // Step 13: Create Tax Deductions for 2024
    console.log("\n1️⃣3️⃣ Creating tax deductions for 2024...");
    
    // Delete existing tax deductions
    await db.delete(taxDeductions).where(eq(taxDeductions.userId, userId));

    const taxDeductionItems = [
      { category: "epf", description: "EPF Contribution", amount: "46200.00", lhdnCategory: "Individual and Dependent Relatives" }, // 3850 x 12
      { category: "life_insurance", description: "Prudential PRULife", amount: "5400.00", lhdnCategory: "Life Insurance and EPF" }, // 450 x 12
      { category: "medical_insurance", description: "AIA Medical Card", amount: "4560.00", lhdnCategory: "Medical and Education Insurance" }, // 380 x 12
      { category: "sspn", description: "SSPN-i Plus - Nur Aisyah", amount: "6000.00", lhdnCategory: "SSPN" }, // 500 x 12
      { category: "child_education", description: "Sri KDU International School Fees", amount: "38400.00", lhdnCategory: "Child Education" }, // 3200 x 12
      { category: "lifestyle", description: "Gym Membership", amount: "2256.00", lhdnCategory: "Lifestyle" }, // 188 x 12
      { category: "education_fees", description: "Professional Development Courses", amount: "3500.00", lhdnCategory: "Education (Self)" },
      { category: "self_medical", description: "Medical Expenses", amount: "1200.00", lhdnCategory: "Medical Expenses (Self)" },
      { category: "donations", description: "Charitable Donations", amount: "2500.00", lhdnCategory: "Approved Donations" },
    ];

    for (const deduction of taxDeductionItems) {
      await db.insert(taxDeductions).values({
        userId,
        year: 2024,
        category: deduction.category,
        lhdnCategory: deduction.lhdnCategory,
        amount: deduction.amount,
        description: deduction.description,
        verified: true,
        verifiedAt: new Date(),
        forSelf: true,
      });
    }
    console.log(`   ✅ Created ${taxDeductionItems.length} tax deductions for 2024`);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEMO USER SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`
📊 Summary:
   - User: ${USER_PROFILE.name} (${USER_EMAIL})
   - Finance Group: Sharifah's Family Finance
   - Categories: ${allCategories.length}
   - Vendors: ${VENDORS_DATA.length}
   - Credit Cards: ${CREDIT_CARDS_DATA.length}
   - Subscriptions: ${SUBSCRIPTIONS_DATA.length}
   - Commitments: ${COMMITMENTS_DATA.length}
   - Goals: ${GOALS_DATA.length}
   - Budgets: ${budgetItems.length}
   - Transactions: ${transactionCount}
   - Tax Deductions: ${taxDeductionItems.length}
   
💡 The dashboard should now be populated with data!
   Login with: ${USER_EMAIL}
`);

  } catch (error) {
    console.error("❌ Error seeding demo user:", error);
    throw error;
  }
}

// Run the seed
seedDemoUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
