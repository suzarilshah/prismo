import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, financeGroups, financeGroupMembers, categories, goals, userSettings, transactions, subscriptions, budgets, notifications, taxDeductions, vendors, creditCards, commitments } from "@/db/schema";
import { eq, or } from "drizzle-orm";

// Reset/delete a user by email (for testing purposes)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Delete all user data in order (respecting foreign key constraints)
    // Most tables cascade on delete, but let's be thorough

    // Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, user.id));

    // Delete tax deductions
    await db.delete(taxDeductions).where(eq(taxDeductions.userId, user.id));

    // Delete transactions
    await db.delete(transactions).where(eq(transactions.userId, user.id));

    // Delete subscriptions
    await db.delete(subscriptions).where(eq(subscriptions.userId, user.id));

    // Delete commitments
    await db.delete(commitments).where(eq(commitments.userId, user.id));

    // Delete budgets
    await db.delete(budgets).where(eq(budgets.userId, user.id));

    // Delete goals
    await db.delete(goals).where(eq(goals.userId, user.id));

    // Delete credit cards
    await db.delete(creditCards).where(eq(creditCards.userId, user.id));

    // Delete vendors
    await db.delete(vendors).where(eq(vendors.userId, user.id));

    // Delete categories
    await db.delete(categories).where(eq(categories.userId, user.id));

    // Delete user settings
    await db.delete(userSettings).where(eq(userSettings.userId, user.id));

    // Delete finance group members
    await db.delete(financeGroupMembers).where(eq(financeGroupMembers.userId, user.id));

    // Delete finance groups owned by user
    await db.delete(financeGroups).where(eq(financeGroups.ownerId, user.id));

    // Finally, delete the user
    await db.delete(users).where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: `User ${email} has been deleted successfully`,
    });
  } catch (error) {
    console.error("Reset user error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to reset user" 
      },
      { status: 500 }
    );
  }
}
