import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taxDeductions, transactions, categories } from "@/db/schema";
import { eq, and, desc, gte, lte, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notifyTaxDeductionAdded } from "@/lib/notification-service";

// LHDN Relief Categories with YA 2024 limits (Malaysian Tax)
const LHDN_RELIEF_CATEGORIES = {
  "Self & Dependents": { limit: 9000, categories: ["basic_personal"] },
  "Medical Expenses": { limit: 8000, categories: ["medical", "self_medical", "parents_medical"] },
  "Education & Learning": { limit: 7000, categories: ["education", "education_fees", "skill_development"] },
  "EPF & Life Insurance": { limit: 7000, categories: ["epf", "life_insurance"] },
  "Private Retirement Scheme": { limit: 3000, categories: ["prs"] },
  "Lifestyle": { limit: 2500, categories: ["lifestyle", "books", "tech"] },
  "Sports Equipment": { limit: 500, categories: ["sports"] },
  "SOCSO": { limit: 350, categories: ["socso"] },
  "Zakat": { limit: null, categories: ["zakat", "charity"] }, // No limit - deducted from tax
  "Medical Insurance": { limit: 3000, categories: ["medical_insurance", "education_insurance"] },
  "SSPN": { limit: 8000, categories: ["sspn"] },
  "EV Charging": { limit: 2500, categories: ["ev_charging"] },
  "Childcare": { limit: 3000, categories: ["childcare"] },
  "Breastfeeding Equipment": { limit: 1000, categories: ["breastfeeding"] },
  "Housing Loan Interest": { limit: 7000, categories: ["housing_loan"] },
};

// Map category tax types to LHDN categories
function mapToLhdnCategory(taxCategory: string | null): string | null {
  if (!taxCategory) return null;
  
  for (const [lhdnCat, config] of Object.entries(LHDN_RELIEF_CATEGORIES)) {
    if (config.categories.includes(taxCategory.toLowerCase())) {
      return lhdnCat;
    }
  }
  return null;
}

// GET /api/tax-deductions - List all tax deductions with computed data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const includeTransactions = searchParams.get("includeTransactions") === "true";

    // Get existing deductions
    const deductions = await db
      .select()
      .from(taxDeductions)
      .where(and(eq(taxDeductions.userId, session.user.id), eq(taxDeductions.year, year)))
      .orderBy(desc(taxDeductions.createdAt));

    let taxDeductibleTransactions: any[] = [];
    
    // Get tax-deductible transactions from the year
    if (includeTransactions) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);

      taxDeductibleTransactions = await db
        .select({
          transaction: transactions,
          category: categories,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, session.user.id),
            eq(transactions.type, "expense"),
            gte(transactions.date, startOfYear),
            lte(transactions.date, endOfYear),
            isNotNull(categories.isTaxDeductible)
          )
        );

      // Filter only tax-deductible categories
      taxDeductibleTransactions = taxDeductibleTransactions.filter(
        (tx) => tx.category?.isTaxDeductible === true
      );
    }

    // Calculate totals by LHDN category
    const categoryBreakdown = Object.entries(LHDN_RELIEF_CATEGORIES).map(([name, config]) => {
      // Sum from manual deductions
      const manualTotal = deductions
        .filter((d) => d.lhdnCategory === name || d.category === name)
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);

      // Sum from transactions
      const transactionTotal = taxDeductibleTransactions
        .filter((tx) => {
          const mapped = mapToLhdnCategory(tx.category?.taxCategory);
          return mapped === name;
        })
        .reduce((sum, tx) => sum + parseFloat(tx.transaction.amount), 0);

      const total = manualTotal + transactionTotal;
      const claimable = config.limit ? Math.min(total, config.limit) : total;

      return {
        name,
        limit: config.limit,
        manualTotal,
        transactionTotal,
        total,
        claimable,
        remaining: config.limit ? Math.max(0, config.limit - total) : null,
        percentage: config.limit ? (total / config.limit) * 100 : 0,
      };
    });

    // Calculate tax estimates (Malaysian progressive tax rates 2024)
    const taxBrackets = [
      { min: 0, max: 5000, rate: 0 },
      { min: 5000, max: 20000, rate: 0.01 },
      { min: 20000, max: 35000, rate: 0.03 },
      { min: 35000, max: 50000, rate: 0.06 },
      { min: 50000, max: 70000, rate: 0.11 },
      { min: 70000, max: 100000, rate: 0.19 },
      { min: 100000, max: 400000, rate: 0.25 },
      { min: 400000, max: 600000, rate: 0.26 },
      { min: 600000, max: 2000000, rate: 0.28 },
      { min: 2000000, max: Infinity, rate: 0.30 },
    ];

    const totalClaimable = categoryBreakdown.reduce((sum, cat) => sum + cat.claimable, 0);

    return NextResponse.json({
      success: true,
      data: deductions,
      categoryBreakdown,
      taxDeductibleTransactions: includeTransactions ? taxDeductibleTransactions : undefined,
      summary: {
        year,
        totalDeductions: categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0),
        totalClaimable,
        lhdnCategories: LHDN_RELIEF_CATEGORIES,
        taxBrackets,
      },
    });
  } catch (error) {
    console.error("Error fetching tax deductions:", error);
    return NextResponse.json({ error: "Failed to fetch tax deductions" }, { status: 500 });
  }
}

// POST /api/tax-deductions - Create a new tax deduction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Map to LHDN category if not provided
    const lhdnCategory = body.lhdnCategory || mapToLhdnCategory(body.category);

    const year = body.year || new Date().getFullYear();
    
    const [newDeduction] = await db
      .insert(taxDeductions)
      .values({
        userId: session.user.id,
        transactionId: body.transactionId || null,
        category: body.category,
        lhdnCategory,
        description: body.description,
        amount: body.amount.toString(),
        year,
        dateIncurred: body.dateIncurred ? new Date(body.dateIncurred) : new Date(),
        receiptUrl: body.receiptUrl || null,
        verified: body.verified || false,
      })
      .returning();

    // Create notification for new tax deduction
    await notifyTaxDeductionAdded(
      session.user.id,
      lhdnCategory || body.category,
      parseFloat(body.amount),
      "MYR",
      year,
      newDeduction.id
    );

    return NextResponse.json({ success: true, data: newDeduction });
  } catch (error) {
    console.error("Error creating tax deduction:", error);
    return NextResponse.json({ error: "Failed to create tax deduction" }, { status: 500 });
  }
}
