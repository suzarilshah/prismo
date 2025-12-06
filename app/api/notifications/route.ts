import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, notificationActivityLog } from "@/db/schema";
import { eq, and, desc, sql, lt, isNull, or } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET /api/notifications - Get user notifications with pagination
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const unreadOnly = searchParams.get("unread") === "true";
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [
      eq(notifications.userId, authUser.id),
      or(
        isNull(notifications.expiresAt),
        sql`${notifications.expiresAt} > NOW()`
      ),
      eq(notifications.isDismissed, false),
    ];

    if (category) {
      conditions.push(eq(notifications.category, category));
    }

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    // Get notifications
    const results = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...conditions));

    // Get unread count
    const [unreadResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, authUser.id),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          or(
            isNull(notifications.expiresAt),
            sql`${notifications.expiresAt} > NOW()`
          )
        )
      );

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
      unreadCount: unreadResult?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "mark-all-read") {
      // Get all unread notification IDs for logging
      const unreadNotifications = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, authUser.id),
            eq(notifications.isRead, false)
          )
        );

      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.userId, authUser.id),
            eq(notifications.isRead, false)
          )
        );

      // Log the activity for each notification
      if (unreadNotifications.length > 0) {
        await db.insert(notificationActivityLog).values(
          unreadNotifications.map((n) => ({
            notificationId: n.id,
            userId: authUser.id,
            action: "read",
          }))
        );
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${unreadNotifications.length} notifications as read`,
        count: unreadNotifications.length,
      });
    }

    if (action === "dismiss-all") {
      const dismissedNotifications = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, authUser.id),
            eq(notifications.isDismissed, false)
          )
        );

      await db
        .update(notifications)
        .set({ isDismissed: true, dismissedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.userId, authUser.id),
            eq(notifications.isDismissed, false)
          )
        );

      if (dismissedNotifications.length > 0) {
        await db.insert(notificationActivityLog).values(
          dismissedNotifications.map((n) => ({
            notificationId: n.id,
            userId: authUser.id,
            action: "dismissed",
          }))
        );
      }

      return NextResponse.json({
        success: true,
        message: `Dismissed ${dismissedNotifications.length} notifications`,
        count: dismissedNotifications.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      { error: "Failed to process notifications" },
      { status: 500 }
    );
  }
}
