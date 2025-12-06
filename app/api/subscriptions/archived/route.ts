import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/subscriptions/archived - Get all archived/cancelled subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const archivedSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          isNotNull(subscriptions.terminatedAt)
        )
      )
      .orderBy(subscriptions.terminatedAt);

    // Calculate monthly savings (sum of all cancelled subscription amounts)
    const totalSaved = archivedSubscriptions.reduce((sum, sub) => {
      const amount = parseFloat(sub.amount);
      if (sub.frequency === "monthly") return sum + amount;
      if (sub.frequency === "yearly") return sum + amount / 12;
      if (sub.frequency === "weekly") return sum + amount * 4;
      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: archivedSubscriptions,
        summary: {
          totalArchived: archivedSubscriptions.length,
          totalSaved,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching archived subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/archived - Restore a cancelled subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
    }

    // Verify ownership
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, session.user.id)
      ),
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Restore the subscription
    const [restored] = await db
      .update(subscriptions)
      .set({
        terminatedAt: null,
        terminationReason: null,
        terminationEffectiveDate: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return NextResponse.json({
      success: true,
      data: restored,
    });
  } catch (error) {
    console.error("Error restoring subscription:", error);
    return NextResponse.json(
      { error: "Failed to restore subscription" },
      { status: 500 }
    );
  }
}
