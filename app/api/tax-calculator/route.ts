import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, taxDeductions, taxYears, monthlyPcbRecords, transactions } from "@/db/schema";
import { eq, and, sum, gte, lte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { 
  LHDN_RELIEF_CATEGORIES, 
  MALAYSIA_TAX_BRACKETS, 
  calculateMalaysianTax,
  getActiveCategoriesForYear 
} from "@/db/seed-lhdn-categories";

// GET /api/tax-calculator - Calculate tax for the current user
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate total income from transactions
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const incomeResult = await db
      .select({
        totalIncome: sum(transactions.amount),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, authUser.id),
          eq(transactions.type, "income"),
          gte(transactions.date, startOfYear),
          lte(transactions.date, endOfYear)
        )
      );

    const totalIncome = parseFloat(incomeResult[0]?.totalIncome || "0") || parseFloat(user.annualIncome || "0") || parseFloat(user.salary || "0") * 12;

    // Get tax deductions grouped by category
    const deductions = await db
      .select()
      .from(taxDeductions)
      .where(
        and(
          eq(taxDeductions.userId, authUser.id),
          eq(taxDeductions.year, year)
        )
      );

    // Calculate totals by category
    const categoryTotals: Record<string, { total: number; items: typeof deductions }> = {};
    const activeCategoriesForYear = getActiveCategoriesForYear(year);

    for (const deduction of deductions) {
      const category = deduction.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, items: [] };
      }
      categoryTotals[category].total += parseFloat(deduction.amount);
      categoryTotals[category].items.push(deduction);
    }

    // Calculate claimable amounts (applying limits)
    const categoryBreakdown = activeCategoriesForYear.map(cat => {
      const userTotal = categoryTotals[cat.code]?.total || 0;
      const limit = cat.maxAmount;
      const claimable = limit ? Math.min(userTotal, limit) : userTotal;
      const remaining = limit ? Math.max(0, limit - userTotal) : null;
      const percentage = limit ? (userTotal / limit) * 100 : 0;

      return {
        code: cat.code,
        name: cat.name,
        nameMs: cat.nameMs,
        reliefType: cat.reliefType,
        limit,
        userTotal,
        claimable,
        remaining,
        percentage,
        items: categoryTotals[cat.code]?.items || [],
        itemCount: categoryTotals[cat.code]?.items.length || 0,
      };
    });

    // Calculate total reliefs, deductions, rebates
    const totalReliefs = categoryBreakdown
      .filter(c => c.reliefType === "relief")
      .reduce((sum, c) => sum + c.claimable, 0);

    const totalDeductionsAmount = categoryBreakdown
      .filter(c => c.reliefType === "deduction")
      .reduce((sum, c) => sum + c.claimable, 0);

    const totalRebates = categoryBreakdown
      .filter(c => c.reliefType === "rebate")
      .reduce((sum, c) => sum + c.claimable, 0);

    // Calculate chargeable income
    const chargeableIncome = Math.max(0, totalIncome - totalReliefs - totalDeductionsAmount);

    // Calculate tax
    const { taxPayable: grossTax, effectiveRate, breakdown: taxBreakdown } = calculateMalaysianTax(chargeableIncome);

    // Apply rebates (reduce tax payable)
    const netTaxPayable = Math.max(0, grossTax - totalRebates);

    // Get PCB records for the year
    const pcbRecords = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.userId, authUser.id),
          eq(monthlyPcbRecords.year, year)
        )
      );

    const totalPcbPaid = pcbRecords.reduce((sum, r) => sum + parseFloat(r.pcbAmount || "0"), 0);

    // Calculate tax refund or amount owed
    const taxRefund = totalPcbPaid > netTaxPayable ? totalPcbPaid - netTaxPayable : 0;
    const taxOwed = netTaxPayable > totalPcbPaid ? netTaxPayable - totalPcbPaid : 0;

    // Monthly breakdown for forecast
    const currentMonth = new Date().getMonth() + 1;
    const monthsRemaining = 12 - currentMonth;
    const monthlyAvgIncome = totalIncome / (currentMonth || 1);
    const projectedAnnualIncome = monthlyAvgIncome * 12;
    
    const projectedChargeableIncome = Math.max(0, projectedAnnualIncome - totalReliefs - totalDeductionsAmount);
    const { taxPayable: projectedTax } = calculateMalaysianTax(projectedChargeableIncome);
    const projectedNetTax = Math.max(0, projectedTax - totalRebates);

    return NextResponse.json({
      success: true,
      data: {
        year,
        income: {
          gross: totalIncome,
          projected: projectedAnnualIncome,
          fromTransactions: parseFloat(incomeResult[0]?.totalIncome || "0"),
          fromProfile: parseFloat(user.annualIncome || "0") || parseFloat(user.salary || "0") * 12,
        },
        deductions: {
          totalReliefs,
          totalDeductions: totalDeductionsAmount,
          totalRebates,
          totalClaimable: totalReliefs + totalDeductionsAmount,
        },
        tax: {
          chargeableIncome,
          grossTax,
          rebates: totalRebates,
          netTaxPayable,
          effectiveRate,
          brackets: taxBreakdown,
        },
        pcb: {
          totalPaid: totalPcbPaid,
          monthsRecorded: pcbRecords.length,
          records: pcbRecords,
        },
        result: {
          refund: taxRefund,
          owed: taxOwed,
          status: taxRefund > 0 ? "refund" : taxOwed > 0 ? "owed" : "balanced",
        },
        projection: {
          projectedIncome: projectedAnnualIncome,
          projectedChargeableIncome,
          projectedTax: projectedNetTax,
          monthsRemaining,
        },
        categories: categoryBreakdown,
        user: {
          maritalStatus: user.maritalStatus,
          assessmentType: user.taxAssessmentType,
          numberOfDependents: user.numberOfDependents,
        },
      },
    });
  } catch (error) {
    console.error("Error calculating tax:", error);
    return NextResponse.json(
      { error: "Failed to calculate tax" },
      { status: 500 }
    );
  }
}

// POST /api/tax-calculator - Save or update tax year record
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { year, ...taxData } = body;

    // Check if tax year record exists
    const [existing] = await db
      .select()
      .from(taxYears)
      .where(
        and(
          eq(taxYears.userId, authUser.id),
          eq(taxYears.year, year)
        )
      );

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(taxYears)
        .set({
          ...taxData,
          updatedAt: new Date(),
        })
        .where(eq(taxYears.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Tax year updated",
      });
    } else {
      // Create new
      const [created] = await db
        .insert(taxYears)
        .values({
          userId: authUser.id,
          year,
          ...taxData,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: created,
        message: "Tax year created",
      });
    }
  } catch (error) {
    console.error("Error saving tax year:", error);
    return NextResponse.json(
      { error: "Failed to save tax year" },
      { status: 500 }
    );
  }
}
