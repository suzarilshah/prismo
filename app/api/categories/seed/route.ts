import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Default expense categories with Malaysian context
const DEFAULT_EXPENSE_CATEGORIES = [
  // Housing & Utilities
  { name: "Rent", color: "#EF4444", icon: "home", taxCategory: null, isTaxDeductible: false },
  { name: "Housing Loan", color: "#DC2626", icon: "building", taxCategory: "housing_loan", isTaxDeductible: true },
  { name: "Electric Bill", color: "#F59E0B", icon: "zap", taxCategory: null, isTaxDeductible: false },
  { name: "Water Bill", color: "#3B82F6", icon: "droplet", taxCategory: null, isTaxDeductible: false },
  { name: "Internet & WiFi", color: "#8B5CF6", icon: "wifi", taxCategory: null, isTaxDeductible: false },
  { name: "Phone Bill", color: "#6366F1", icon: "smartphone", taxCategory: null, isTaxDeductible: false },
  
  // Transportation
  { name: "Petrol", color: "#F97316", icon: "fuel", taxCategory: null, isTaxDeductible: false },
  { name: "Car Loan", color: "#EA580C", icon: "car", taxCategory: null, isTaxDeductible: false },
  { name: "Car Insurance", color: "#D97706", icon: "shield", taxCategory: null, isTaxDeductible: false },
  { name: "Parking", color: "#A16207", icon: "parking", taxCategory: null, isTaxDeductible: false },
  { name: "TNG Reload", color: "#0EA5E9", icon: "credit-card", taxCategory: null, isTaxDeductible: false },
  { name: "Grab/Taxi", color: "#22C55E", icon: "car", taxCategory: null, isTaxDeductible: false },
  { name: "Toll", color: "#78716C", icon: "route", taxCategory: null, isTaxDeductible: false },
  
  // Food & Dining
  { name: "Groceries", color: "#22C55E", icon: "shopping-cart", taxCategory: null, isTaxDeductible: false },
  { name: "Dining Out", color: "#F43F5E", icon: "utensils", taxCategory: null, isTaxDeductible: false },
  { name: "Coffee & Drinks", color: "#A78BFA", icon: "coffee", taxCategory: null, isTaxDeductible: false },
  { name: "Food Delivery", color: "#FB923C", icon: "package", taxCategory: null, isTaxDeductible: false },
  
  // Shopping & Lifestyle
  { name: "Shopping", color: "#EC4899", icon: "shopping-bag", taxCategory: null, isTaxDeductible: false },
  { name: "Clothing", color: "#E879F9", icon: "shirt", taxCategory: null, isTaxDeductible: false },
  { name: "Personal Care", color: "#F472B6", icon: "user", taxCategory: null, isTaxDeductible: false },
  
  // Healthcare
  { name: "Medical", color: "#14B8A6", icon: "heart", taxCategory: "medical", isTaxDeductible: true },
  { name: "Pharmacy", color: "#2DD4BF", icon: "pill", taxCategory: "medical", isTaxDeductible: true },
  { name: "Health Insurance", color: "#0D9488", icon: "shield", taxCategory: "insurance_medical", isTaxDeductible: true },
  
  // Financial
  { name: "Credit Card Payment", color: "#EF4444", icon: "credit-card", taxCategory: null, isTaxDeductible: false },
  { name: "Bank Fees", color: "#94A3B8", icon: "landmark", taxCategory: null, isTaxDeductible: false },
  { name: "Transfer", color: "#64748B", icon: "arrow-right-left", taxCategory: null, isTaxDeductible: false },
  { name: "Loan Payment", color: "#B91C1C", icon: "banknote", taxCategory: null, isTaxDeductible: false },
  
  // Education
  { name: "Education", color: "#3B82F6", icon: "graduation-cap", taxCategory: "education", isTaxDeductible: true },
  { name: "Books & Courses", color: "#60A5FA", icon: "book", taxCategory: "education", isTaxDeductible: true },
  { name: "Child Education", color: "#2563EB", icon: "school", taxCategory: "sspn", isTaxDeductible: true },
  
  // Insurance & Investment
  { name: "Life Insurance", color: "#10B981", icon: "shield-check", taxCategory: "life_insurance", isTaxDeductible: true },
  { name: "EPF/KWSP", color: "#059669", icon: "piggy-bank", taxCategory: "epf", isTaxDeductible: true },
  { name: "Private Retirement", color: "#047857", icon: "trending-up", taxCategory: "prs", isTaxDeductible: true },
  
  // Entertainment & Leisure
  { name: "Entertainment", color: "#8B5CF6", icon: "film", taxCategory: null, isTaxDeductible: false },
  { name: "Streaming", color: "#A855F7", icon: "tv", taxCategory: null, isTaxDeductible: false },
  { name: "Sports & Fitness", color: "#22C55E", icon: "dumbbell", taxCategory: "lifestyle", isTaxDeductible: true },
  { name: "Travel & Vacation", color: "#06B6D4", icon: "plane", taxCategory: "domestic_travel", isTaxDeductible: true },
  
  // Family & Social
  { name: "Family Support", color: "#F472B6", icon: "users", taxCategory: "parents", isTaxDeductible: true },
  { name: "Gifts", color: "#FB7185", icon: "gift", taxCategory: null, isTaxDeductible: false },
  { name: "Charity/Zakat", color: "#34D399", icon: "heart-handshake", taxCategory: "zakat", isTaxDeductible: true },
  
  // Other
  { name: "Subscriptions", color: "#8B5CF6", icon: "repeat", taxCategory: null, isTaxDeductible: false },
  { name: "Home Maintenance", color: "#78716C", icon: "wrench", taxCategory: null, isTaxDeductible: false },
  { name: "Pets", color: "#FBBF24", icon: "paw-print", taxCategory: null, isTaxDeductible: false },
  { name: "Other Expenses", color: "#6B7280", icon: "more-horizontal", taxCategory: null, isTaxDeductible: false },
];

// Default income categories
const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", color: "#22C55E", icon: "briefcase", taxCategory: null, isTaxDeductible: false },
  { name: "Bonus", color: "#10B981", icon: "gift", taxCategory: null, isTaxDeductible: false },
  { name: "Freelance", color: "#14B8A6", icon: "laptop", taxCategory: null, isTaxDeductible: false },
  { name: "Investment Returns", color: "#0EA5E9", icon: "trending-up", taxCategory: null, isTaxDeductible: false },
  { name: "Dividends", color: "#3B82F6", icon: "pie-chart", taxCategory: null, isTaxDeductible: false },
  { name: "Rental Income", color: "#6366F1", icon: "home", taxCategory: null, isTaxDeductible: false },
  { name: "Commission", color: "#8B5CF6", icon: "percent", taxCategory: null, isTaxDeductible: false },
  { name: "Side Business", color: "#A855F7", icon: "store", taxCategory: null, isTaxDeductible: false },
  { name: "Gifts Received", color: "#EC4899", icon: "gift", taxCategory: null, isTaxDeductible: false },
  { name: "Tax Refund", color: "#F43F5E", icon: "receipt", taxCategory: null, isTaxDeductible: false },
  { name: "Other Income", color: "#6B7280", icon: "plus-circle", taxCategory: null, isTaxDeductible: false },
];

// POST /api/categories/seed - Seed default categories for user
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser.id;

    // Check if user already has categories
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1);

    if (existingCategories.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Categories already exist",
        seeded: false,
      });
    }

    // Insert expense categories
    const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      type: "expense" as const,
      isTaxDeductible: cat.isTaxDeductible,
      taxCategory: cat.taxCategory,
      isSystem: true,
    }));

    // Insert income categories
    const incomeCategories = DEFAULT_INCOME_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      type: "income" as const,
      isTaxDeductible: cat.isTaxDeductible,
      taxCategory: cat.taxCategory,
      isSystem: true,
    }));

    await db.insert(categories).values([...expenseCategories, ...incomeCategories]);

    return NextResponse.json({
      success: true,
      message: "Categories seeded successfully",
      seeded: true,
      count: expenseCategories.length + incomeCategories.length,
    });
  } catch (error) {
    console.error("Error seeding categories:", error);
    return NextResponse.json(
      { error: "Failed to seed categories" },
      { status: 500 }
    );
  }
}
