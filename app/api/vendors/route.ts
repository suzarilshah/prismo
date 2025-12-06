import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors, categories } from "@/db/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { notifyVendorAdded } from "@/lib/notification-service";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().uuid().optional().nullable().or(z.literal("")),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  logo: z.string().optional(),
  defaultPaymentMethod: z.string().optional(),
  isFavorite: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

// GET /api/vendors - List all vendors
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const favoritesOnly = searchParams.get("favorites") === "true";

    const conditions: any[] = [eq(vendors.userId, authUser.id)];

    if (search) {
      conditions.push(
        or(
          ilike(vendors.name, `%${search}%`),
          ilike(vendors.description, `%${search}%`)
        ) as any
      );
    }

    if (categoryId) {
      conditions.push(eq(vendors.categoryId, categoryId));
    }

    if (favoritesOnly) {
      conditions.push(eq(vendors.isFavorite, true));
    }

    const results = await db
      .select({
        vendor: vendors,
        category: categories,
      })
      .from(vendors)
      .leftJoin(categories, eq(vendors.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(vendors.isFavorite), vendors.name);

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        ...r.vendor,
        category: r.category,
      })),
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = vendorSchema.parse(body);

    // Clean up empty strings
    const categoryId = validatedData.categoryId && validatedData.categoryId !== "" 
      ? validatedData.categoryId 
      : null;
    const website = validatedData.website && validatedData.website !== ""
      ? validatedData.website
      : null;
    const email = validatedData.email && validatedData.email !== ""
      ? validatedData.email
      : null;

    const [newVendor] = await db
      .insert(vendors)
      .values({
        userId: authUser.id,
        name: validatedData.name,
        categoryId,
        description: validatedData.description,
        website,
        phone: validatedData.phone,
        email,
        address: validatedData.address,
        logo: validatedData.logo,
        defaultPaymentMethod: validatedData.defaultPaymentMethod,
        isFavorite: validatedData.isFavorite,
        notes: validatedData.notes,
      })
      .returning();

    // Create notification for new vendor
    await notifyVendorAdded(
      authUser.id,
      validatedData.name,
      newVendor.id
    );

    return NextResponse.json({
      success: true,
      data: newVendor,
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
