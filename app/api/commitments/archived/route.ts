import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commitments, commitmentPayments, categories } from "@/db/schema";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/commitments/archived - Get all archived/terminated commitments
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all terminated commitments
    const archivedCommitments = await db
      .select({
        commitment: commitments,
        category: categories,
      })
      .from(commitments)
      .leftJoin(categories, eq(commitments.categoryId, categories.id))
      .where(
        and(
          eq(commitments.userId, userId),
          isNotNull(commitments.terminatedAt)
        )
      )
      .orderBy(desc(commitments.terminatedAt));

    // Calculate total paid for each commitment
    const commitmentsWithTotalPaid = await Promise.all(
      archivedCommitments.map(async ({ commitment, category }) => {
        const payments = await db
          .select()
          .from(commitmentPayments)
          .where(
            and(
              eq(commitmentPayments.commitmentId, commitment.id),
              eq(commitmentPayments.isPaid, true)
            )
          );

        const totalPaid = payments.reduce((sum, p) => {
          return sum + parseFloat(p.paidAmount || commitment.amount);
        }, 0);

        const paymentCount = payments.length;

        return {
          ...commitment,
          category,
          totalPaid,
          paymentCount,
        };
      })
    );

    // Calculate summary stats
    const totalArchivedAmount = commitmentsWithTotalPaid.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );

    const totalPaidBeforeTermination = commitmentsWithTotalPaid.reduce(
      (sum, c) => sum + c.totalPaid,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        commitments: commitmentsWithTotalPaid,
        summary: {
          totalArchived: commitmentsWithTotalPaid.length,
          totalPaidBeforeTermination,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching archived commitments:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived commitments" },
      { status: 500 }
    );
  }
}

// POST /api/commitments/archived - Restore a terminated commitment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { commitmentId } = body;

    if (!commitmentId) {
      return NextResponse.json(
        { error: "Commitment ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(commitments)
      .where(
        and(
          eq(commitments.id, commitmentId),
          eq(commitments.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 }
      );
    }

    // Restore the commitment
    const [restored] = await db
      .update(commitments)
      .set({
        isActive: true,
        terminatedAt: null,
        terminationReason: null,
        terminationEffectiveDate: null,
        updatedAt: new Date(),
      })
      .where(eq(commitments.id, commitmentId))
      .returning();

    return NextResponse.json({
      success: true,
      data: restored,
      message: "Commitment restored successfully",
    });
  } catch (error) {
    console.error("Error restoring commitment:", error);
    return NextResponse.json(
      { error: "Failed to restore commitment" },
      { status: 500 }
    );
  }
}
