import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  transactions, 
  goals, 
  budgets, 
  taxDeductions, 
  categories, 
  subscriptions, 
  commitments,
  creditCards,
  users
} from "@/db/schema";
import { eq, and, gte, lte, sum, count, sql, desc, isNull, lt } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // ============================================
    // INCOME & EXPENSES (Current + Last Month)
    // ============================================
    const [currentMonthIncome] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, startOfMonth)
        )
      );

    const [currentMonthExpenses] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startOfMonth)
        )
      );

    const [lastMonthIncome] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, startOfLastMonth),
          lte(transactions.date, endOfLastMonth)
        )
      );

    const [lastMonthExpenses] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startOfLastMonth),
          lte(transactions.date, endOfLastMonth)
        )
      );

    // All-time totals for net worth calculation
    const [allTimeIncome] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income")));

    const [allTimeExpenses] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense")));

    const income = parseFloat(currentMonthIncome.total || "0");
    const expenses = parseFloat(currentMonthExpenses.total || "0");
    const lastIncome = parseFloat(lastMonthIncome.total || "0");
    const lastExpenses = parseFloat(lastMonthExpenses.total || "0");
    const totalIncome = parseFloat(allTimeIncome.total || "0");
    const totalExpenses = parseFloat(allTimeExpenses.total || "0");

    const incomeChange = lastIncome > 0 ? ((income - lastIncome) / lastIncome) * 100 : 0;
    const expenseChange = lastExpenses > 0 ? ((expenses - lastExpenses) / lastExpenses) * 100 : 0;

    // ============================================
    // UPCOMING BILLS (Subscriptions + Commitments)
    // ============================================
    const upcomingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.isActive, true),
          isNull(subscriptions.terminatedAt),
          lte(subscriptions.nextBillingDate, next30Days)
        )
      )
      .orderBy(subscriptions.nextBillingDate)
      .limit(5);

    const upcomingCommitments = await db
      .select()
      .from(commitments)
      .where(
        and(
          eq(commitments.userId, userId),
          eq(commitments.isActive, true),
          lte(commitments.nextDueDate, next30Days)
        )
      )
      .orderBy(commitments.nextDueDate)
      .limit(5);

    // Combine and sort upcoming bills
    const upcomingBills = [
      ...upcomingSubscriptions.map(s => ({
        id: s.id,
        name: s.name,
        amount: parseFloat(s.amount),
        dueDate: s.nextBillingDate,
        type: 'subscription' as const,
        frequency: s.frequency,
        icon: s.icon,
        daysUntil: Math.ceil((new Date(s.nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      ...upcomingCommitments.map(c => ({
        id: c.id,
        name: c.name,
        amount: parseFloat(c.amount),
        dueDate: c.nextDueDate,
        type: 'commitment' as const,
        frequency: c.frequency,
        icon: c.icon,
        daysUntil: Math.ceil((new Date(c.nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    ].sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 6);

    // Bills due soon (within 7 days)
    const billsDueSoon = upcomingBills.filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
    const overdueCount = upcomingBills.filter(b => b.daysUntil < 0).length;

    // Total recurring monthly
    const [subscriptionsTotal] = await db
      .select({
        monthly: sql<number>`SUM(
          CASE 
            WHEN frequency = 'monthly' THEN CAST(amount AS DECIMAL)
            WHEN frequency = 'yearly' THEN CAST(amount AS DECIMAL) / 12
            WHEN frequency = 'weekly' THEN CAST(amount AS DECIMAL) * 4
            ELSE CAST(amount AS DECIMAL)
          END
        )`,
        count: count(),
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.isActive, true),
          isNull(subscriptions.terminatedAt)
        )
      );

    const [commitmentsTotal] = await db
      .select({
        monthly: sql<number>`SUM(
          CASE 
            WHEN frequency = 'monthly' THEN CAST(amount AS DECIMAL)
            WHEN frequency = 'yearly' THEN CAST(amount AS DECIMAL) / 12
            WHEN frequency = 'quarterly' THEN CAST(amount AS DECIMAL) / 3
            ELSE CAST(amount AS DECIMAL)
          END
        )`,
        count: count(),
      })
      .from(commitments)
      .where(and(eq(commitments.userId, userId), eq(commitments.isActive, true)));

    // ============================================
    // BUDGET HEALTH
    // ============================================
    const budgetsList = await db
      .select({
        budget: budgets,
        category: categories,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId));

    // Calculate spending for each budget category
    const budgetsWithSpending = await Promise.all(
      budgetsList.map(async ({ budget, category }) => {
        const [spending] = await db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.type, "expense"),
              eq(transactions.categoryId, budget.categoryId!),
              gte(transactions.date, startOfMonth),
              lte(transactions.date, endOfMonth)
            )
          );

        const spent = parseFloat(spending?.total || "0");
        const limit = parseFloat(budget.amount);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        const remaining = limit - spent;

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: category?.name || "Uncategorized",
          categoryColor: category?.color || "#94A3B8",
          limit,
          spent,
          remaining,
          percentage: Math.min(percentage, 100),
          status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'healthy',
          alertThreshold: budget.alertThreshold || 80,
        };
      })
    );

    const budgetsExceeded = budgetsWithSpending.filter(b => b.status === 'exceeded').length;
    const budgetsWarning = budgetsWithSpending.filter(b => b.status === 'warning').length;

    // ============================================
    // CREDIT CARDS SUMMARY
    // ============================================
    const creditCardsList = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), eq(creditCards.isActive, true)))
      .orderBy(desc(creditCards.isPrimary))
      .limit(4);

    const creditCardsWithSpending = await Promise.all(
      creditCardsList.map(async (card) => {
        const [monthSpending] = await db
          .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
          .from(transactions)
          .where(
            and(
              eq(transactions.creditCardId, card.id),
              gte(transactions.date, startOfMonth),
              lte(transactions.date, endOfMonth)
            )
          );

        const spent = Number(monthSpending?.total || 0);
        const limit = card.creditLimit ? Number(card.creditLimit) : null;
        const utilization = limit ? (spent / limit) * 100 : null;

        return {
          id: card.id,
          bankName: card.bankName,
          cardName: card.cardName,
          cardType: card.cardType,
          lastFourDigits: card.lastFourDigits,
          cardColor: card.cardColor,
          creditLimit: limit,
          monthlySpending: spent,
          utilization,
          paymentDueDay: card.paymentDueDay,
          isPrimary: card.isPrimary,
        };
      })
    );

    const totalCreditLimit = creditCardsWithSpending.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const totalCreditSpending = creditCardsWithSpending.reduce((sum, c) => sum + c.monthlySpending, 0);

    // ============================================
    // GOALS PROGRESS
    // ============================================
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isCompleted, false)))
      .orderBy(desc(goals.createdAt))
      .limit(4);

    const goalsWithProgress = activeGoals.map(goal => {
      const current = parseFloat(goal.currentAmount || "0");
      const target = parseFloat(goal.targetAmount);
      const progress = target > 0 ? (current / target) * 100 : 0;
      const remaining = target - current;
      const daysLeft = goal.deadline 
        ? Math.ceil((new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: goal.id,
        name: goal.name,
        category: goal.category,
        icon: goal.icon,
        color: goal.color,
        currentAmount: current,
        targetAmount: target,
        remaining,
        progress: Math.min(progress, 100),
        deadline: goal.deadline,
        daysLeft,
      };
    });

    // ============================================
    // SPENDING BY CATEGORY
    // ============================================
    const spendingByCategory = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        total: sum(transactions.amount),
        count: count(transactions.id),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startOfMonth)
        )
      )
      .groupBy(transactions.categoryId, categories.name, categories.color)
      .orderBy(desc(sum(transactions.amount)))
      .limit(6);

    // ============================================
    // RECENT TRANSACTIONS
    // ============================================
    const recentTransactions = await db
      .select({
        transaction: transactions,
        category: categories,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(8);

    // ============================================
    // TAX DEDUCTIONS
    // ============================================
    const [taxSummary] = await db
      .select({ total: sum(taxDeductions.amount) })
      .from(taxDeductions)
      .where(and(eq(taxDeductions.userId, userId), eq(taxDeductions.year, now.getFullYear())));

    // ============================================
    // FINANCIAL HEALTH SCORE (0-100)
    // ============================================
    let healthScore = 50; // Base score
    const healthFactors: { name: string; score: number; status: 'good' | 'warning' | 'poor' }[] = [];

    // Savings Rate Factor (0-25 points)
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const savingsScore = Math.min(Math.max(savingsRate, 0) * 1.25, 25);
    healthScore += savingsScore - 12.5;
    healthFactors.push({
      name: 'Savings Rate',
      score: savingsScore,
      status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'warning' : 'poor',
    });

    // Budget Adherence Factor (0-25 points)
    const healthyBudgets = budgetsWithSpending.filter(b => b.status === 'healthy').length;
    const totalBudgets = budgetsWithSpending.length;
    const budgetScore = totalBudgets > 0 ? (healthyBudgets / totalBudgets) * 25 : 15;
    healthScore += budgetScore - 12.5;
    healthFactors.push({
      name: 'Budget Health',
      score: budgetScore,
      status: budgetsExceeded === 0 && budgetsWarning === 0 ? 'good' : budgetsExceeded === 0 ? 'warning' : 'poor',
    });

    // Bills On-Time Factor (0-25 points)
    const billsScore = overdueCount === 0 ? 25 : Math.max(25 - overdueCount * 8, 0);
    healthScore += billsScore - 12.5;
    healthFactors.push({
      name: 'Bills On-Time',
      score: billsScore,
      status: overdueCount === 0 ? 'good' : overdueCount <= 2 ? 'warning' : 'poor',
    });

    // Credit Utilization Factor (0-25 points)
    const avgUtilization = totalCreditLimit > 0 ? (totalCreditSpending / totalCreditLimit) * 100 : 0;
    const creditScore = avgUtilization <= 30 ? 25 : avgUtilization <= 50 ? 18 : avgUtilization <= 70 ? 10 : 0;
    healthScore += creditScore - 12.5;
    healthFactors.push({
      name: 'Credit Utilization',
      score: creditScore,
      status: avgUtilization <= 30 ? 'good' : avgUtilization <= 50 ? 'warning' : 'poor',
    });

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // ============================================
    // QUICK INSIGHTS
    // ============================================
    const insights: { type: 'success' | 'warning' | 'info' | 'alert'; message: string; action?: string }[] = [];

    if (savingsRate >= 20) {
      insights.push({ type: 'success', message: `Great job! You're saving ${savingsRate.toFixed(0)}% of your income.` });
    } else if (savingsRate < 10 && income > 0) {
      insights.push({ type: 'warning', message: `Your savings rate is ${savingsRate.toFixed(0)}%. Consider reducing expenses.`, action: '/dashboard/budgets' });
    }

    if (budgetsExceeded > 0) {
      insights.push({ type: 'alert', message: `${budgetsExceeded} budget${budgetsExceeded > 1 ? 's' : ''} exceeded this month.`, action: '/dashboard/budgets' });
    }

    if (billsDueSoon.length > 0) {
      insights.push({ type: 'info', message: `${billsDueSoon.length} bill${billsDueSoon.length > 1 ? 's' : ''} due within 7 days.`, action: '/dashboard/subscriptions' });
    }

    if (overdueCount > 0) {
      insights.push({ type: 'alert', message: `${overdueCount} overdue payment${overdueCount > 1 ? 's' : ''} need attention!`, action: '/dashboard/commitments' });
    }

    // ============================================
    // RESPONSE
    // ============================================
    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: userProfile?.name || 'User',
          email: userProfile?.email,
          currency: userProfile?.currency || 'MYR',
        },
        overview: {
          income: { current: income, change: incomeChange, lastMonth: lastIncome },
          expenses: { current: expenses, change: expenseChange, lastMonth: lastExpenses },
          netCashFlow: income - expenses,
          savingsRate,
          netWorth: totalIncome - totalExpenses,
        },
        upcomingBills: {
          items: upcomingBills,
          dueSoon: billsDueSoon.length,
          overdue: overdueCount,
          totalRecurringMonthly: (subscriptionsTotal.monthly || 0) + (commitmentsTotal.monthly || 0),
          subscriptionsCount: subscriptionsTotal.count || 0,
          commitmentsCount: commitmentsTotal.count || 0,
        },
        budgets: {
          items: budgetsWithSpending.slice(0, 4),
          total: budgetsWithSpending.length,
          exceeded: budgetsExceeded,
          warning: budgetsWarning,
          healthy: budgetsWithSpending.filter(b => b.status === 'healthy').length,
        },
        creditCards: {
          items: creditCardsWithSpending,
          totalLimit: totalCreditLimit,
          totalSpending: totalCreditSpending,
          avgUtilization,
        },
        goals: {
          items: goalsWithProgress,
          total: goalsWithProgress.length,
          totalSaved: goalsWithProgress.reduce((sum, g) => sum + g.currentAmount, 0),
          totalTarget: goalsWithProgress.reduce((sum, g) => sum + g.targetAmount, 0),
        },
        spendingByCategory: spendingByCategory.map((item) => ({
          categoryId: item.categoryId,
          categoryName: item.categoryName || "Uncategorized",
          categoryColor: item.categoryColor || "#94A3B8",
          total: parseFloat(item.total || "0"),
          count: item.count,
        })),
        recentTransactions: recentTransactions.map((item) => ({
          ...item.transaction,
          category: item.category,
        })),
        taxDeductions: {
          total: parseFloat(taxSummary?.total || "0"),
          year: now.getFullYear(),
        },
        healthScore: {
          score: healthScore,
          factors: healthFactors,
          status: healthScore >= 75 ? 'excellent' : healthScore >= 50 ? 'good' : healthScore >= 25 ? 'fair' : 'poor',
        },
        insights,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
