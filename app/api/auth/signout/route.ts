import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut();
    
    return NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sign out",
      },
      { status: 500 }
    );
  }
}
