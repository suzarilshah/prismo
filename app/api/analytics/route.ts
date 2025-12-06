import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/analytics - Comprehensive analytics endpoint
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
    const view = searchParams.get("view") || "monthly"; // 'yearly', 'monthly', 'daily'

    const userId = authUser.id;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get all transactions for the year
    const yearTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startOfYear),
          lte(transactions.date, endOfYear)
        )
      )
      .orderBy(desc(transactions.date));

    // Calculate monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString("default", { month: "short" }),
      income: 0,
      expenses: 0,
      net: 0,
      salaryIncome: 0,
      bonusIncome: 0,
      freelanceIncome: 0,
      investmentIncome: 0,
      otherIncome: 0,
    }));

    // Income by type for the year
    const incomeByType = {
      salary: 0,
      bonus: 0,
      freelance: 0,
      investment: 0,
      commission: 0,
      other: 0,
    };

    // Expense by category
    const expenseByCategory: Record<string, number> = {};

    // Process transactions
    yearTransactions.forEach((tx) => {
      const txMonth = new Date(tx.date).getMonth();
      const amount = parseFloat(tx.amount);

      if (tx.type === "income") {
        monthlyData[txMonth].income += amount;
        monthlyData[txMonth].net += amount;

        // Track by income type
        const incomeType = tx.incomeType || "other";
        if (incomeType in incomeByType) {
          incomeByType[incomeType as keyof typeof incomeByType] += amount;
        }

        // Track monthly income types
        switch (tx.incomeType) {
          case "salary":
            monthlyData[txMonth].salaryIncome += amount;
            break;
          case "bonus":
            monthlyData[txMonth].bonusIncome += amount;
            break;
          case "freelance":
            monthlyData[txMonth].freelanceIncome += amount;
            break;
          case "investment":
            monthlyData[txMonth].investmentIncome += amount;
            break;
          default:
            monthlyData[txMonth].otherIncome += amount;
        }
      } else {
        monthlyData[txMonth].expenses += amount;
        monthlyData[txMonth].net -= amount;

        // Track by category (using vendor as category name for now)
        const category = tx.vendor || "Uncategorized";
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
      }
    });

    // Calculate totals
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Get daily data for current month if requested
    let dailyData: { day: number; date: string; income: number; expenses: number; net: number }[] = [];
    if (view === "daily" && month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
        income: 0,
        expenses: 0,
        net: 0,
      }));

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      const monthTransactions = yearTransactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      monthTransactions.forEach((tx) => {
        const day = new Date(tx.date).getDate() - 1;
        const amount = parseFloat(tx.amount);
        if (tx.type === "income") {
          dailyData[day].income += amount;
          dailyData[day].net += amount;
        } else {
          dailyData[day].expenses += amount;
          dailyData[day].net -= amount;
        }
      });
    }

    // Get income records for salary tracking
    const incomeRecords = yearTransactions
      .filter((tx) => tx.type === "income")
      .map((tx) => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        incomeType: tx.incomeType || "other",
        incomeMonth: tx.incomeMonth || new Date(tx.date).getMonth() + 1,
        incomeYear: tx.incomeYear || year,
        description: tx.description,
        date: tx.date,
      }));

    // Top expense categories
    const topExpenseCategories = Object.entries(expenseByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        year,
        summary: {
          totalIncome,
          totalExpenses,
          netCashFlow,
          savingsRate: Math.round(savingsRate * 100) / 100,
          avgMonthlyIncome: totalIncome / 12,
          avgMonthlyExpenses: totalExpenses / 12,
        },
        incomeByType,
        monthlyData,
        dailyData: view === "daily" ? dailyData : null,
        topExpenseCategories,
        incomeRecords,
        transactionCount: yearTransactions.length,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
