import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  icon: z.string().optional(),
  type: z.enum(["income", "expense"]),
  parentId: z.string().uuid().optional().nullable(),
  isTaxDeductible: z.boolean().default(false),
  taxCategory: z.string().optional(),
});

// Default categories to seed
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Rent", color: "#EF4444", icon: "home", taxCategory: null, isTaxDeductible: false },
  { name: "Housing Loan", color: "#DC2626", icon: "building", taxCategory: "housing_loan", isTaxDeductible: true },
  { name: "Electric Bill", color: "#F59E0B", icon: "zap", taxCategory: null, isTaxDeductible: false },
  { name: "Water Bill", color: "#3B82F6", icon: "droplet", taxCategory: null, isTaxDeductible: false },
  { name: "Internet & WiFi", color: "#8B5CF6", icon: "wifi", taxCategory: null, isTaxDeductible: false },
  { name: "Phone Bill", color: "#6366F1", icon: "smartphone", taxCategory: null, isTaxDeductible: false },
  { name: "Petrol", color: "#F97316", icon: "fuel", taxCategory: null, isTaxDeductible: false },
  { name: "Car Loan", color: "#EA580C", icon: "car", taxCategory: null, isTaxDeductible: false },
  { name: "TNG Reload", color: "#0EA5E9", icon: "credit-card", taxCategory: null, isTaxDeductible: false },
  { name: "Groceries", color: "#22C55E", icon: "shopping-cart", taxCategory: null, isTaxDeductible: false },
  { name: "Dining Out", color: "#F43F5E", icon: "utensils", taxCategory: null, isTaxDeductible: false },
  { name: "Shopping", color: "#EC4899", icon: "shopping-bag", taxCategory: null, isTaxDeductible: false },
  { name: "Medical", color: "#14B8A6", icon: "heart", taxCategory: "medical", isTaxDeductible: true },
  { name: "Credit Card Payment", color: "#EF4444", icon: "credit-card", taxCategory: null, isTaxDeductible: false },
  { name: "Transfer", color: "#64748B", icon: "arrow-right-left", taxCategory: null, isTaxDeductible: false },
  { name: "Education", color: "#3B82F6", icon: "graduation-cap", taxCategory: "education", isTaxDeductible: true },
  { name: "Life Insurance", color: "#10B981", icon: "shield-check", taxCategory: "life_insurance", isTaxDeductible: true },
  { name: "EPF/KWSP", color: "#059669", icon: "piggy-bank", taxCategory: "epf", isTaxDeductible: true },
  { name: "Entertainment", color: "#8B5CF6", icon: "film", taxCategory: null, isTaxDeductible: false },
  { name: "Subscriptions", color: "#A855F7", icon: "repeat", taxCategory: null, isTaxDeductible: false },
  { name: "Charity/Zakat", color: "#34D399", icon: "heart-handshake", taxCategory: "zakat", isTaxDeductible: true },
  { name: "Other Expenses", color: "#6B7280", icon: "more-horizontal", taxCategory: null, isTaxDeductible: false },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", color: "#22C55E", icon: "briefcase", taxCategory: null, isTaxDeductible: false },
  { name: "Bonus", color: "#10B981", icon: "gift", taxCategory: null, isTaxDeductible: false },
  { name: "Freelance", color: "#14B8A6", icon: "laptop", taxCategory: null, isTaxDeductible: false },
  { name: "Investment Returns", color: "#0EA5E9", icon: "trending-up", taxCategory: null, isTaxDeductible: false },
  { name: "Dividends", color: "#3B82F6", icon: "pie-chart", taxCategory: null, isTaxDeductible: false },
  { name: "Commission", color: "#8B5CF6", icon: "percent", taxCategory: null, isTaxDeductible: false },
  { name: "Other Income", color: "#6B7280", icon: "plus-circle", taxCategory: null, isTaxDeductible: false },
];

async function seedCategoriesForUser(userId: string) {
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
}

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Check if user has any categories, if not seed defaults
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, session.user.id))
      .limit(1);

    if (existingCategories.length === 0) {
      await seedCategoriesForUser(session.user.id);
    }

    const conditions = [eq(categories.userId, session.user.id)];

    if (type) {
      conditions.push(eq(categories.type, type as "income" | "expense"));
    }

    const results = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(desc(categories.isSystem), categories.name);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: session.user.id,
        ...validatedData,
        isSystem: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
