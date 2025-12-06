import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/user-settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        success: true,
        data: {
          currency: "MYR",
          language: "en",
          timezone: "Asia/Kuala_Lumpur",
          dateFormat: "DD/MM/YYYY",
          notifications: true,
          emailNotifications: true,
          theme: "system",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

// PUT /api/user-settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const [updatedSettings] = await db
      .update(userSettings)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, body.userId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}
