import { config } from "dotenv";
config(); // Load .env file

import { db } from "./index";
import {
  users,
  categories,
  transactions,
  subscriptions,
  goals,
  budgets,
  userSettings,
  taxDeductions,
  achievements,
} from "./schema";

// Comprehensive seed data for Prismo Finance
export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Create demo user
    const [demoUser] = await db
      .insert(users)
      .values({
        email: "demo@prismofinance.com",
        name: "Ahmad Rashid",
        currency: "MYR",
        salary: "15000.00",
        occupation: "Senior Software Engineer",
        emailVerified: true,
        twoFactorEnabled: false,
      })
      .returning();

    console.log("✅ Demo user created");

    // 2. Create default categories
    const categoryData = [
      // Expense Categories
      {
        userId: demoUser.id,
        name: "Food & Dining",
        color: "#FF6B6B",
        icon: "UtensilsCrossed",
        type: "expense",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Transportation",
        color: "#4ECDC4",
        icon: "Car",
        type: "expense",
        isTaxDeductible: true,
        taxCategory: "Business Transport",
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Shopping",
        color: "#95E1D3",
        icon: "ShoppingBag",
        type: "expense",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Entertainment",
        color: "#F38181",
        icon: "Film",
        type: "expense",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Healthcare",
        color: "#00D9FF",
        icon: "Heart",
        type: "expense",
        isTaxDeductible: true,
        taxCategory: "Medical Expenses",
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Education",
        color: "#A8E6CF",
        icon: "GraduationCap",
        type: "expense",
        isTaxDeductible: true,
        taxCategory: "Education Fees",
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Utilities",
        color: "#FFD93D",
        icon: "Zap",
        type: "expense",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Insurance",
        color: "#6BCB77",
        icon: "Shield",
        type: "expense",
        isTaxDeductible: true,
        taxCategory: "Insurance Premiums",
        isSystem: true,
      },
      // Income Categories
      {
        userId: demoUser.id,
        name: "Salary",
        color: "#10B981",
        icon: "Wallet",
        type: "income",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Freelance",
        color: "#3B82F6",
        icon: "Briefcase",
        type: "income",
        isTaxDeductible: false,
        isSystem: true,
      },
      {
        userId: demoUser.id,
        name: "Investments",
        color: "#8B5CF6",
        icon: "TrendingUp",
        type: "income",
        isTaxDeductible: false,
        isSystem: true,
      },
    ];

    const createdCategories = await db
      .insert(categories)
      .values(categoryData)
      .returning();

    console.log(`✅ ${createdCategories.length} categories created`);

    // Get category IDs for transactions
    const foodCat = createdCategories.find((c) => c.name === "Food & Dining");
    const transportCat = createdCategories.find((c) => c.name === "Transportation");
    const shoppingCat = createdCategories.find((c) => c.name === "Shopping");
    const entertainmentCat = createdCategories.find((c) => c.name === "Entertainment");
    const healthcareCat = createdCategories.find((c) => c.name === "Healthcare");
    const salaryCat = createdCategories.find((c) => c.name === "Salary");
    const freelanceCat = createdCategories.find((c) => c.name === "Freelance");

    // 3. Create realistic transactions (last 3 months)
    const transactionData = [
      // November 2024 - Income
      {
        userId: demoUser.id,
        categoryId: salaryCat?.id,
        amount: "15000.00",
        currency: "MYR",
        description: "Monthly Salary - November",
        date: new Date("2024-11-01"),
        type: "income",
        paymentMethod: "bank_transfer",
        vendor: "Tech Corp Sdn Bhd",
      },
      {
        userId: demoUser.id,
        categoryId: freelanceCat?.id,
        amount: "5500.00",
        currency: "MYR",
        description: "Web Development Project",
        date: new Date("2024-11-15"),
        type: "income",
        paymentMethod: "online",
        vendor: "Client XYZ",
      },
      // November 2024 - Expenses
      {
        userId: demoUser.id,
        categoryId: foodCat?.id,
        amount: "450.50",
        currency: "MYR",
        description: "Groceries - Village Grocer",
        date: new Date("2024-11-05"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Village Grocer",
      },
      {
        userId: demoUser.id,
        categoryId: transportCat?.id,
        amount: "180.00",
        currency: "MYR",
        description: "Petrol - Shell",
        date: new Date("2024-11-07"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Shell Malaysia",
      },
      {
        userId: demoUser.id,
        categoryId: foodCat?.id,
        amount: "125.80",
        currency: "MYR",
        description: "Dinner - Pavilion KL",
        date: new Date("2024-11-10"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Din Tai Fung",
      },
      {
        userId: demoUser.id,
        categoryId: shoppingCat?.id,
        amount: "890.00",
        currency: "MYR",
        description: "New laptop accessories",
        date: new Date("2024-11-12"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Apple Store",
      },
      {
        userId: demoUser.id,
        categoryId: entertainmentCat?.id,
        amount: "55.00",
        currency: "MYR",
        description: "Movie tickets",
        date: new Date("2024-11-14"),
        type: "expense",
        paymentMethod: "online",
        vendor: "GSC Cinemas",
      },
      {
        userId: demoUser.id,
        categoryId: healthcareCat?.id,
        amount: "350.00",
        currency: "MYR",
        description: "Medical checkup",
        date: new Date("2024-11-18"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Pantai Hospital",
        tags: ["tax-deductible", "health"],
      },
      {
        userId: demoUser.id,
        categoryId: foodCat?.id,
        amount: "78.50",
        currency: "MYR",
        description: "Lunch - KLCC",
        date: new Date("2024-11-20"),
        type: "expense",
        paymentMethod: "card",
        vendor: "The Apartment",
      },
      {
        userId: demoUser.id,
        categoryId: transportCat?.id,
        amount: "45.00",
        currency: "MYR",
        description: "Grab ride",
        date: new Date("2024-11-22"),
        type: "expense",
        paymentMethod: "online",
        vendor: "Grab Malaysia",
      },
      // October 2024
      {
        userId: demoUser.id,
        categoryId: salaryCat?.id,
        amount: "15000.00",
        currency: "MYR",
        description: "Monthly Salary - October",
        date: new Date("2024-10-01"),
        type: "income",
        paymentMethod: "bank_transfer",
        vendor: "Tech Corp Sdn Bhd",
      },
      {
        userId: demoUser.id,
        categoryId: foodCat?.id,
        amount: "520.00",
        currency: "MYR",
        description: "Groceries",
        date: new Date("2024-10-08"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Jaya Grocer",
      },
      {
        userId: demoUser.id,
        categoryId: transportCat?.id,
        amount: "200.00",
        currency: "MYR",
        description: "Petrol",
        date: new Date("2024-10-12"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Petronas",
      },
      {
        userId: demoUser.id,
        categoryId: shoppingCat?.id,
        amount: "1250.00",
        currency: "MYR",
        description: "Clothing shopping",
        date: new Date("2024-10-15"),
        type: "expense",
        paymentMethod: "card",
        vendor: "Zara",
      },
      {
        userId: demoUser.id,
        categoryId: entertainmentCat?.id,
        amount: "180.00",
        currency: "MYR",
        description: "Concert tickets",
        date: new Date("2024-10-25"),
        type: "expense",
        paymentMethod: "online",
        vendor: "TicketCharge",
      },
    ];

    const createdTransactions = await db
      .insert(transactions)
      .values(transactionData)
      .returning();

    console.log(`✅ ${createdTransactions.length} transactions created`);

    // 4. Create subscriptions
    const subscriptionData = [
      {
        userId: demoUser.id,
        categoryId: entertainmentCat?.id,
        name: "Netflix Premium",
        amount: "55.00",
        currency: "MYR",
        frequency: "monthly",
        nextBillingDate: new Date("2024-12-01"),
        startDate: new Date("2023-01-01"),
        isActive: true,
        reminderDays: 3,
        website: "https://netflix.com",
      },
      {
        userId: demoUser.id,
        categoryId: entertainmentCat?.id,
        name: "Spotify Family",
        amount: "26.90",
        currency: "MYR",
        frequency: "monthly",
        nextBillingDate: new Date("2024-12-05"),
        startDate: new Date("2023-03-15"),
        isActive: true,
        reminderDays: 3,
        website: "https://spotify.com",
      },
      {
        userId: demoUser.id,
        categoryId: shoppingCat?.id,
        name: "Amazon Prime",
        amount: "8.99",
        currency: "USD",
        frequency: "monthly",
        nextBillingDate: new Date("2024-12-10"),
        startDate: new Date("2023-06-01"),
        isActive: true,
        reminderDays: 5,
        website: "https://amazon.com",
      },
      {
        userId: demoUser.id,
        categoryId: healthcareCat?.id,
        name: "AIA Life Insurance",
        amount: "450.00",
        currency: "MYR",
        frequency: "monthly",
        nextBillingDate: new Date("2024-12-15"),
        startDate: new Date("2022-01-15"),
        isActive: true,
        reminderDays: 7,
        notes: "Critical illness coverage",
      },
      {
        userId: demoUser.id,
        categoryId: transportCat?.id,
        name: "Car Loan",
        amount: "1580.00",
        currency: "MYR",
        frequency: "monthly",
        nextBillingDate: new Date("2024-12-01"),
        startDate: new Date("2023-01-01"),
        endDate: new Date("2027-12-31"),
        isActive: true,
        reminderDays: 5,
        notes: "Honda Civic 2023",
      },
    ];

    const createdSubscriptions = await db
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();

    console.log(`✅ ${createdSubscriptions.length} subscriptions created`);

    // 5. Create financial goals
    const goalData = [
      {
        userId: demoUser.id,
        name: "Emergency Fund",
        description: "Build 6 months of expenses as safety net",
        targetAmount: "50000.00",
        currentAmount: "32500.00",
        currency: "MYR",
        deadline: new Date("2025-06-30"),
        category: "savings",
        icon: "Shield",
        color: "#10B981",
        isCompleted: false,
      },
      {
        userId: demoUser.id,
        name: "Property Down Payment",
        description: "Save for first property purchase",
        targetAmount: "150000.00",
        currentAmount: "85000.00",
        currency: "MYR",
        deadline: new Date("2026-12-31"),
        category: "house",
        icon: "Home",
        color: "#3B82F6",
        isCompleted: false,
      },
      {
        userId: demoUser.id,
        name: "Japan Vacation",
        description: "2-week trip to Tokyo and Osaka",
        targetAmount: "25000.00",
        currentAmount: "18500.00",
        currency: "MYR",
        deadline: new Date("2025-03-15"),
        category: "vacation",
        icon: "Plane",
        color: "#F59E0B",
        isCompleted: false,
      },
      {
        userId: demoUser.id,
        name: "Investment Portfolio",
        description: "Build diversified investment portfolio",
        targetAmount: "100000.00",
        currentAmount: "45000.00",
        currency: "MYR",
        deadline: new Date("2025-12-31"),
        category: "investing",
        icon: "TrendingUp",
        color: "#8B5CF6",
        isCompleted: false,
      },
    ];

    const createdGoals = await db.insert(goals).values(goalData).returning();

    console.log(`✅ ${createdGoals.length} financial goals created`);

    // 6. Create budgets
    const budgetData = [
      {
        userId: demoUser.id,
        categoryId: foodCat?.id,
        amount: "1500.00",
        period: "monthly",
        startDate: new Date("2024-11-01"),
        alertThreshold: 80,
      },
      {
        userId: demoUser.id,
        categoryId: transportCat?.id,
        amount: "800.00",
        period: "monthly",
        startDate: new Date("2024-11-01"),
        alertThreshold: 85,
      },
      {
        userId: demoUser.id,
        categoryId: shoppingCat?.id,
        amount: "2000.00",
        period: "monthly",
        startDate: new Date("2024-11-01"),
        alertThreshold: 75,
      },
      {
        userId: demoUser.id,
        categoryId: entertainmentCat?.id,
        amount: "500.00",
        period: "monthly",
        startDate: new Date("2024-11-01"),
        alertThreshold: 90,
      },
    ];

    const createdBudgets = await db.insert(budgets).values(budgetData).returning();

    console.log(`✅ ${createdBudgets.length} budgets created`);

    // 7. Create tax deductions
    const taxDeductionData = [
      {
        userId: demoUser.id,
        year: 2024,
        category: "Medical Expenses",
        amount: "5500.00",
        maxAmount: "8000.00",
        description: "Medical checkups, prescriptions, and treatments",
      },
      {
        userId: demoUser.id,
        year: 2024,
        category: "Insurance Premiums",
        amount: "5400.00",
        maxAmount: "3000.00",
        description: "Life insurance and medical insurance premiums",
      },
      {
        userId: demoUser.id,
        year: 2024,
        category: "EPF Contributions",
        amount: "4000.00",
        maxAmount: "4000.00",
        description: "Additional voluntary EPF contributions",
      },
      {
        userId: demoUser.id,
        year: 2024,
        category: "Lifestyle",
        amount: "1850.00",
        maxAmount: "2500.00",
        description: "Sports equipment, books, and internet subscription",
      },
    ];

    const createdTaxDeductions = await db
      .insert(taxDeductions)
      .values(taxDeductionData)
      .returning();

    console.log(`✅ ${createdTaxDeductions.length} tax deductions created`);

    // 8. Create achievements
    const achievementData = [
      {
        userId: demoUser.id,
        type: "savings_streak",
        title: "Savings Champion",
        description: "Saved consistently for 3 months straight",
        icon: "Trophy",
      },
      {
        userId: demoUser.id,
        type: "budget_adherence",
        title: "Budget Master",
        description: "Stayed within budget for 2 consecutive months",
        icon: "Target",
      },
      {
        userId: demoUser.id,
        type: "goal_milestone",
        title: "Goal Getter",
        description: "Reached 50% of your emergency fund goal",
        icon: "Award",
      },
    ];

    const createdAchievements = await db
      .insert(achievements)
      .values(achievementData)
      .returning();

    console.log(`✅ ${createdAchievements.length} achievements created`);

    // 9. Create user settings
    await db.insert(userSettings).values({
      userId: demoUser.id,
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
      dashboardWidgets: [
        "net_worth",
        "cash_flow",
        "spending_trend",
        "financial_health",
        "tax_deductions",
        "budget_progress",
      ],
    });

    console.log("✅ User settings created");

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - 1 demo user`);
    console.log(`   - ${createdCategories.length} categories`);
    console.log(`   - ${createdTransactions.length} transactions`);
    console.log(`   - ${createdSubscriptions.length} subscriptions`);
    console.log(`   - ${createdGoals.length} goals`);
    console.log(`   - ${createdBudgets.length} budgets`);
    console.log(`   - ${createdTaxDeductions.length} tax deductions`);
    console.log(`   - ${createdAchievements.length} achievements`);
    console.log(`   - 1 user settings profile`);
    
    return { success: true, userId: demoUser.id };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
