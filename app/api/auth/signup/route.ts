import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIP, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for signup (prevent abuse)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.auth);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = signUpSchema.parse(body);
    
    // Create user
    const user = await signUp(
      validatedData.email,
      validatedData.password,
      validatedData.name
    );
    
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: "Account created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0].message,
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
