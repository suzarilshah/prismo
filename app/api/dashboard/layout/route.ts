import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET - Fetch user's dashboard layout
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, authUser.id),
    });

    return NextResponse.json({
      layout: settings?.dashboardLayout || { cardOrder: [] },
    });
  } catch (error) {
    console.error("Error fetching dashboard layout:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard layout" },
      { status: 500 }
    );
  }
}

// PUT - Update user's dashboard layout
export async function PUT(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cardOrder } = body;

    if (!Array.isArray(cardOrder)) {
      return NextResponse.json(
        { error: "Invalid cardOrder format" },
        { status: 400 }
      );
    }

    // Check if user settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, authUser.id),
    });

    if (existingSettings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          dashboardLayout: { cardOrder },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, authUser.id));
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        userId: authUser.id,
        dashboardLayout: { cardOrder },
      });
    }

    return NextResponse.json({
      success: true,
      layout: { cardOrder },
    });
  } catch (error) {
    console.error("Error updating dashboard layout:", error);
    return NextResponse.json(
      { error: "Failed to update dashboard layout" },
      { status: 500 }
    );
  }
}
