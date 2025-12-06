import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { financeGroups } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

// GET - Get single finance group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [group] = await db
      .select()
      .from(financeGroups)
      .where(eq(financeGroups.id, id));

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("Error fetching finance group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

// PATCH - Update finance group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const { id } = await params;
    const body = await request.json();

    // Check if group exists and user owns it
    const [existingGroup] = await db
      .select()
      .from(financeGroups)
      .where(and(eq(financeGroups.id, id), eq(financeGroups.ownerId, userId)));

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found or you don't have permission" }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await db
        .update(financeGroups)
        .set({ isDefault: false })
        .where(and(eq(financeGroups.ownerId, userId), eq(financeGroups.isDefault, true)));
    }

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

    const [updatedGroup] = await db
      .update(financeGroups)
      .set(updateData)
      .where(eq(financeGroups.id, id))
      .returning();

    return NextResponse.json({ data: updatedGroup });
  } catch (error) {
    console.error("Error updating finance group:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

// DELETE - Delete finance group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const { id } = await params;

    // Check if group exists and user owns it
    const [existingGroup] = await db
      .select()
      .from(financeGroups)
      .where(and(eq(financeGroups.id, id), eq(financeGroups.ownerId, userId)));

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found or you don't have permission" }, { status: 404 });
    }

    // Don't allow deleting the only/default group
    if (existingGroup.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default group" }, { status: 400 });
    }

    // Delete the group (cascade will handle related records)
    await db.delete(financeGroups).where(eq(financeGroups.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting finance group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
