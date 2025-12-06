import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionAmountHistory } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/subscriptions/[id]/modify-amount - Get amount change history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id)
      ),
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const history = await db
      .select()
      .from(subscriptionAmountHistory)
      .where(eq(subscriptionAmountHistory.subscriptionId, id))
      .orderBy(desc(subscriptionAmountHistory.effectiveDate));

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching subscription amount history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/[id]/modify-amount - Upgrade/downgrade subscription
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newAmount, newPlanTier, effectiveDate, reason } = body;

    // Verify ownership
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id)
      ),
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const previousAmount = parseFloat(subscription.amount);
    const updatedAmount = parseFloat(newAmount);
    const changeType = updatedAmount > previousAmount ? "upgrade" : "downgrade";

    // Create history record
    await db.insert(subscriptionAmountHistory).values({
      subscriptionId: id,
      userId: session.user.id,
      previousAmount: subscription.amount,
      newAmount: newAmount.toString(),
      previousPlanTier: subscription.planTier || null,
      newPlanTier: newPlanTier || null,
      changeType,
      effectiveDate: new Date(effectiveDate),
      reason,
    });

    // Update subscription amount and plan tier
    const [updated] = await db
      .update(subscriptions)
      .set({
        amount: newAmount.toString(),
        planTier: newPlanTier || subscription.planTier,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
      changeType,
    });
  } catch (error) {
    console.error("Error modifying subscription amount:", error);
    return NextResponse.json(
      { error: "Failed to modify amount" },
      { status: 500 }
    );
  }
}
