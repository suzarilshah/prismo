import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/users/demo - Get the demo user
export async function GET() {
  try {
    const [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "demo@prismofinance.com"))
      .limit(1);

    if (!demoUser) {
      return NextResponse.json(
        { error: "Demo user not found. Please run: npm run db:seed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: demoUser,
    });
  } catch (error) {
    console.error("Error fetching demo user:", error);
    return NextResponse.json(
      { error: "Failed to fetch demo user" },
      { status: 500 }
    );
  }
}
