import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/income-summary - Get yearly income breakdown with monthly salary tracking
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const userId = session.user.id;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get all income transactions for the year
    const incomeTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, startOfYear),
          lte(transactions.date, endOfYear)
        )
      )
      .orderBy(desc(transactions.date));

    // Monthly income breakdown
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString("default", { month: "long" }),
      salary: 0,
      bonus: 0,
      freelance: 0,
      investment: 0,
      commission: 0,
      other: 0,
      total: 0,
      transactions: [] as {
        id: string;
        amount: number;
        incomeType: string;
        description: string | null;
        date: Date;
      }[],
    }));

    // Income type totals
    const incomeTypeTotals = {
      salary: 0,
      bonus: 0,
      freelance: 0,
      investment: 0,
      commission: 0,
      other: 0,
    };

    // Process income transactions
    incomeTransactions.forEach((tx) => {
      // Use incomeMonth if set, otherwise use transaction date month
      const month = tx.incomeMonth ? tx.incomeMonth - 1 : new Date(tx.date).getMonth();
      const amount = parseFloat(tx.amount);
      const incomeType = tx.incomeType || "other";

      // Add to monthly breakdown
      monthlyBreakdown[month].total += amount;
      monthlyBreakdown[month].transactions.push({
        id: tx.id,
        amount,
        incomeType,
        description: tx.description,
        date: tx.date,
      });

      // Add to specific income type
      switch (incomeType) {
        case "salary":
          monthlyBreakdown[month].salary += amount;
          incomeTypeTotals.salary += amount;
          break;
        case "bonus":
          monthlyBreakdown[month].bonus += amount;
          incomeTypeTotals.bonus += amount;
          break;
        case "freelance":
          monthlyBreakdown[month].freelance += amount;
          incomeTypeTotals.freelance += amount;
          break;
        case "investment":
          monthlyBreakdown[month].investment += amount;
          incomeTypeTotals.investment += amount;
          break;
        case "commission":
          monthlyBreakdown[month].commission += amount;
          incomeTypeTotals.commission += amount;
          break;
        default:
          monthlyBreakdown[month].other += amount;
          incomeTypeTotals.other += amount;
      }
    });

    const totalYearlyIncome = Object.values(incomeTypeTotals).reduce((sum, val) => sum + val, 0);
    const monthsWithIncome = monthlyBreakdown.filter((m) => m.total > 0).length;
    const avgMonthlyIncome = monthsWithIncome > 0 ? totalYearlyIncome / monthsWithIncome : 0;

    // Calculate salary consistency (how many months have salary)
    const monthsWithSalary = monthlyBreakdown.filter((m) => m.salary > 0).length;
    const avgMonthlySalary = monthsWithSalary > 0 ? incomeTypeTotals.salary / monthsWithSalary : 0;

    return NextResponse.json({
      success: true,
      data: {
        year,
        summary: {
          totalYearlyIncome,
          avgMonthlyIncome,
          totalSalary: incomeTypeTotals.salary,
          totalBonus: incomeTypeTotals.bonus,
          totalFreelance: incomeTypeTotals.freelance,
          totalInvestment: incomeTypeTotals.investment,
          totalCommission: incomeTypeTotals.commission,
          totalOther: incomeTypeTotals.other,
          monthsWithIncome,
          monthsWithSalary,
          avgMonthlySalary,
        },
        incomeTypeTotals,
        monthlyBreakdown,
        recentTransactions: incomeTransactions.slice(0, 10).map((tx) => ({
          id: tx.id,
          amount: parseFloat(tx.amount),
          incomeType: tx.incomeType || "other",
          incomeMonth: tx.incomeMonth,
          incomeYear: tx.incomeYear,
          description: tx.description,
          date: tx.date,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching income summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch income summary" },
      { status: 500 }
    );
  }
}
