import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { storage, BUCKET_ID, ID, deleteFile } from "@/lib/appwrite";

// Upload profile image
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

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Find user in database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.stackId, stackUser.id),
    });

    if (!dbUser) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, stackUser.primaryEmail?.toLowerCase() || ""),
      });
    }

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      );
    }

    // Delete old profile image if it exists and is from Appwrite
    if (dbUser.profileImageUrl && dbUser.profileImageUrl.includes(BUCKET_ID)) {
      try {
        // Extract file ID from URL
        const urlParts = dbUser.profileImageUrl.split("/");
        const fileIdIndex = urlParts.findIndex(part => part === "files") + 1;
        if (fileIdIndex > 0 && urlParts[fileIdIndex]) {
          await deleteFile(urlParts[fileIdIndex]);
        }
      } catch {
        // Ignore deletion errors for old files
      }
    }

    // Upload new file to Appwrite
    const fileId = ID.unique();
    await storage.createFile(BUCKET_ID, fileId, file);
    
    // Get the file view URL
    const profileImageUrl = storage.getFileView(BUCKET_ID, fileId).toString();

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        profileImageUrl: updatedUser.profileImageUrl,
      },
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to upload profile image" 
      },
      { status: 500 }
    );
  }
}

// Delete profile image
export async function DELETE(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser({ tokenStore: request });
    
    if (!stackUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Find user in database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.stackId, stackUser.id),
    });

    if (!dbUser) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, stackUser.primaryEmail?.toLowerCase() || ""),
      });
    }

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Delete file from Appwrite if it exists
    if (dbUser.profileImageUrl && dbUser.profileImageUrl.includes(BUCKET_ID)) {
      try {
        const urlParts = dbUser.profileImageUrl.split("/");
        const fileIdIndex = urlParts.findIndex(part => part === "files") + 1;
        if (fileIdIndex > 0 && urlParts[fileIdIndex]) {
          await deleteFile(urlParts[fileIdIndex]);
        }
      } catch {
        // Ignore deletion errors
      }
    }

    // Clear profile image URL
    await db
      .update(users)
      .set({
        profileImageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    return NextResponse.json({
      success: true,
      message: "Profile image deleted",
    });
  } catch (error) {
    console.error("Profile image delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete profile image" },
      { status: 500 }
    );
  }
}
