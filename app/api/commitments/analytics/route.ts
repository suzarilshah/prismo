import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments } from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/commitments/analytics - Get commitment payment analytics
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = authUser.id;

    // Get all commitments
    const userCommitments = await db
      .select()
      .from(commitments)
      .where(eq(commitments.userId, userId));

    // Get all payments
    const allPayments = await db
      .select()
      .from(commitmentPayments)
      .where(eq(commitmentPayments.userId, userId))
      .orderBy(desc(commitmentPayments.paidAt));

    // Calculate per-commitment analytics
    const commitmentAnalytics = userCommitments.map((commitment) => {
      const payments = allPayments.filter(
        (p) => p.commitmentId === commitment.id && p.isPaid
      );
      
      const totalPaid = payments.reduce(
        (sum, p) => sum + parseFloat(p.paidAmount || commitment.amount),
        0
      );
      
      const paymentCount = payments.length;
      
      // Calculate expected payments based on start date and frequency
      const startDate = new Date(commitment.startDate);
      const now = new Date();
      const endDate = commitment.endDate ? new Date(commitment.endDate) : now;
      const effectiveEndDate = endDate < now ? endDate : now;
      
      let expectedPayments = 0;
      const monthsDiff = (effectiveEndDate.getFullYear() - startDate.getFullYear()) * 12 
        + effectiveEndDate.getMonth() - startDate.getMonth() + 1;
      
      switch (commitment.frequency) {
        case "monthly":
          expectedPayments = Math.max(0, monthsDiff);
          break;
        case "quarterly":
          expectedPayments = Math.max(0, Math.floor(monthsDiff / 3));
          break;
        case "yearly":
          expectedPayments = Math.max(0, Math.floor(monthsDiff / 12));
          break;
        case "one_time":
          expectedPayments = 1;
          break;
      }
      
      // Calculate expected total (what should have been paid by now)
      const expectedTotal = expectedPayments * parseFloat(commitment.amount);
      
      // Payment history by month for chart
      const paymentHistory = payments.map((p) => ({
        year: p.year,
        month: p.month,
        amount: parseFloat(p.paidAmount || commitment.amount),
        paidAt: p.paidAt,
      })).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      
      // First and last payment dates
      const firstPayment = paymentHistory[0];
      const lastPayment = paymentHistory[paymentHistory.length - 1];
      
      return {
        id: commitment.id,
        name: commitment.name,
        commitmentType: commitment.commitmentType,
        amount: parseFloat(commitment.amount),
        frequency: commitment.frequency,
        startDate: commitment.startDate,
        endDate: commitment.endDate,
        isActive: commitment.isActive,
        totalPaid,
        paymentCount,
        expectedPayments,
        expectedTotal,
        completionRate: expectedPayments > 0 
          ? Math.round((paymentCount / expectedPayments) * 100) 
          : 0,
        averagePayment: paymentCount > 0 ? totalPaid / paymentCount : 0,
        firstPaymentDate: firstPayment?.paidAt || null,
        lastPaymentDate: lastPayment?.paidAt || null,
        paymentHistory,
        // For loans with total amount
        totalAmount: commitment.totalAmount ? parseFloat(commitment.totalAmount) : null,
        remainingAmount: commitment.remainingAmount ? parseFloat(commitment.remainingAmount) : null,
        progressPercentage: commitment.totalAmount 
          ? Math.round((totalPaid / parseFloat(commitment.totalAmount)) * 100)
          : null,
      };
    });

    // Overall summary
    const totalPaidAllTime = commitmentAnalytics.reduce(
      (sum, c) => sum + c.totalPaid,
      0
    );
    
    const totalExpectedAllTime = commitmentAnalytics.reduce(
      (sum, c) => sum + c.expectedTotal,
      0
    );
    
    const activeCommitments = commitmentAnalytics.filter((c) => c.isActive);
    const totalMonthlyCommitment = activeCommitments
      .filter((c) => c.frequency === "monthly")
      .reduce((sum, c) => sum + c.amount, 0);
    
    // Monthly trend data (last 12 months)
    const monthlyTrend = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthPayments = allPayments.filter(
        (p) => p.year === year && p.month === month && p.isPaid
      );
      
      const totalForMonth = monthPayments.reduce(
        (sum, p) => {
          const commitment = userCommitments.find((c) => c.id === p.commitmentId);
          return sum + parseFloat(p.paidAmount || commitment?.amount || "0");
        },
        0
      );
      
      monthlyTrend.push({
        year,
        month,
        monthName: date.toLocaleString("default", { month: "short" }),
        total: totalForMonth,
        count: monthPayments.length,
      });
    }

    // Breakdown by commitment type
    const typeBreakdown = commitmentAnalytics.reduce((acc, c) => {
      if (!acc[c.commitmentType]) {
        acc[c.commitmentType] = { count: 0, totalPaid: 0, monthlyAmount: 0 };
      }
      acc[c.commitmentType].count += 1;
      acc[c.commitmentType].totalPaid += c.totalPaid;
      if (c.frequency === "monthly" && c.isActive) {
        acc[c.commitmentType].monthlyAmount += c.amount;
      }
      return acc;
    }, {} as Record<string, { count: number; totalPaid: number; monthlyAmount: number }>);

    return NextResponse.json({
      success: true,
      data: {
        commitments: commitmentAnalytics,
        summary: {
          totalCommitments: userCommitments.length,
          activeCommitments: activeCommitments.length,
          totalPaidAllTime,
          totalExpectedAllTime,
          overallCompletionRate: totalExpectedAllTime > 0 
            ? Math.round((totalPaidAllTime / totalExpectedAllTime) * 100)
            : 0,
          totalMonthlyCommitment,
          averageMonthlyPayment: monthlyTrend.length > 0
            ? monthlyTrend.reduce((sum, m) => sum + m.total, 0) / monthlyTrend.length
            : 0,
        },
        monthlyTrend,
        typeBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching commitment analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch commitment analytics" },
      { status: 500 }
    );
  }
}
