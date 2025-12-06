import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { storage, BUCKET_ID, ID } from "@/lib/appwrite";

// Sync Stack Auth user to our Neon database
export async function POST(request: NextRequest) {
  try {
    // Get the current Stack Auth user
    const stackUser = await stackServerApp.getUser({ tokenStore: request });
    
    if (!stackUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user already exists in our database
    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, stackUser.primaryEmail?.toLowerCase() || ""),
    });

    // Also check by Stack ID
    if (!existingUser && stackUser.id) {
      existingUser = await db.query.users.findFirst({
        where: eq(users.stackId, stackUser.id),
      });
    }

    // Extract name from Stack Auth user
    const displayName = stackUser.displayName || "";
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Get profile image URL from Stack Auth (Google provides this)
    let profileImageUrl = stackUser.profileImageUrl || null;

    // If we have a profile image URL from Google, download and store in Appwrite
    if (profileImageUrl && profileImageUrl.startsWith("http")) {
      try {
        const imageResponse = await fetch(profileImageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageBuffer = await imageBlob.arrayBuffer();
          const imageFile = new File(
            [imageBuffer], 
            `profile-${stackUser.id}.jpg`, 
            { type: "image/jpeg" }
          );

          // Upload to Appwrite
          const fileId = ID.unique();
          await storage.createFile(BUCKET_ID, fileId, imageFile);
          
          // Get the Appwrite file URL
          profileImageUrl = storage.getFileView(BUCKET_ID, fileId).toString();
        }
      } catch (imgError) {
        console.error("Failed to download/upload profile image:", imgError);
        // Keep the original URL if upload fails
      }
    }

    if (existingUser) {
      // Update existing user with Stack Auth info
      const [updatedUser] = await db
        .update(users)
        .set({
          stackId: stackUser.id,
          name: existingUser.name || displayName || null,
          profileImageUrl: existingUser.profileImageUrl || profileImageUrl,
          emailVerified: stackUser.primaryEmailVerified || existingUser.emailVerified,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      // Check if user needs onboarding (no salary/occupation set)
      const needsOnboarding = !updatedUser.occupation && !updatedUser.salary;

      return NextResponse.json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          profileImageUrl: updatedUser.profileImageUrl,
          needsOnboarding,
          isNewUser: false,
        },
      });
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: stackUser.primaryEmail?.toLowerCase() || "",
          name: displayName || null,
          stackId: stackUser.id,
          profileImageUrl,
          emailVerified: stackUser.primaryEmailVerified || false,
          currency: "MYR",
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          firstName,
          lastName,
          profileImageUrl: newUser.profileImageUrl,
          needsOnboarding: true,
          isNewUser: true,
        },
      });
    }
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to sync user" 
      },
      { status: 500 }
    );
  }
}

// Get current user info
export async function GET(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser({ tokenStore: request });
    
    if (!stackUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Find user in our database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.stackId, stackUser.id),
    });

    if (!dbUser) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, stackUser.primaryEmail?.toLowerCase() || ""),
      });
    }

    if (!dbUser) {
      // User exists in Stack Auth but not in our DB - they need to sync
      return NextResponse.json({
        success: true,
        data: {
          stackUser: {
            id: stackUser.id,
            email: stackUser.primaryEmail,
            name: stackUser.displayName,
            profileImageUrl: stackUser.profileImageUrl,
          },
          dbUser: null,
          needsSync: true,
          needsOnboarding: true,
        },
      });
    }

    const needsOnboarding = !dbUser.occupation && !dbUser.salary;

    return NextResponse.json({
      success: true,
      data: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        profileImageUrl: dbUser.profileImageUrl,
        currency: dbUser.currency,
        occupation: dbUser.occupation,
        salary: dbUser.salary,
        needsSync: false,
        needsOnboarding,
      },
    });
  } catch (error) {
    console.error("Auth get error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user" },
      { status: 500 }
    );
  }
}
