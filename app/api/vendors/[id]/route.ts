import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { notifyVendorRemoved } from "@/lib/notification-service";

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional().nullable().or(z.literal("")),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  logo: z.string().optional(),
  defaultPaymentMethod: z.string().optional(),
  isFavorite: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /api/vendors/[id] - Get a specific vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const results = await db
      .select({
        vendor: vendors,
        category: categories,
      })
      .from(vendors)
      .leftJoin(categories, eq(vendors.categoryId, categories.id))
      .where(and(eq(vendors.id, id), eq(vendors.userId, authUser.id)))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results[0].vendor,
        category: results[0].category,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

// PATCH /api/vendors/[id] - Update a vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateVendorSchema.parse(body);

    // Clean up empty strings
    const updateData: any = { ...validatedData, updatedAt: new Date() };
    if (updateData.categoryId === "") updateData.categoryId = null;
    if (updateData.website === "") updateData.website = null;
    if (updateData.email === "") updateData.email = null;

    const [updatedVendor] = await db
      .update(vendors)
      .set(updateData)
      .where(and(eq(vendors.id, id), eq(vendors.userId, authUser.id)))
      .returning();

    if (!updatedVendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id] - Delete a vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [deletedVendor] = await db
      .delete(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.userId, authUser.id)))
      .returning();

    if (!deletedVendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Create notification for vendor removal
    await notifyVendorRemoved(authUser.id, deletedVendor.name);

    return NextResponse.json({
      success: true,
      data: deletedVendor,
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
