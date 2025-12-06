import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// POST /api/subscriptions/[id]/terminate - Terminate a subscription
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
    const { reason, effectiveDate } = body;

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

    // Update subscription with termination info
    const [updated] = await db
      .update(subscriptions)
      .set({
        terminatedAt: new Date(),
        terminationReason: reason || null,
        terminationEffectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error terminating subscription:", error);
    return NextResponse.json(
      { error: "Failed to terminate subscription" },
      { status: 500 }
    );
  }
}
