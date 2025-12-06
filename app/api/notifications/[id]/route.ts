import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, notificationActivityLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/notifications/[id] - Get a single notification
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

    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, session.user.id)
        )
      )
      .limit(1);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/[id] - Update notification (mark as read, dismiss)
export async function PATCH(
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
    const { isRead, isDismissed } = body;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let action = "";

    if (isRead !== undefined) {
      updates.isRead = isRead;
      if (isRead) {
        updates.readAt = new Date();
        action = "read";
      }
    }

    if (isDismissed !== undefined) {
      updates.isDismissed = isDismissed;
      if (isDismissed) {
        updates.dismissedAt = new Date();
        action = "dismissed";
      }
    }

    // Update notification
    const [updated] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();

    // Log activity
    if (action) {
      await db.insert(notificationActivityLog).values({
        notificationId: id,
        userId: session.user.id,
        action,
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
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
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Delete notification (cascade will delete activity log)
    await db.delete(notifications).where(eq(notifications.id, id));

    return NextResponse.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
