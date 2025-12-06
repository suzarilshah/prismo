import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyPcbRecords } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  grossSalary: z.string().optional(),
  bonus: z.string().optional(),
  allowances: z.string().optional(),
  commission: z.string().optional(),
  totalIncome: z.string().optional(),
  epfEmployee: z.string().optional(),
  socso: z.string().optional(),
  eis: z.string().optional(),
  zakat: z.string().optional(),
  pcbAmount: z.string().optional(),
  ytdIncome: z.string().optional(),
  ytdPcb: z.string().optional(),
  ytdEpf: z.string().optional(),
  payslipUrl: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/pcb/[id] - Get a single PCB record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [record] = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.id, id),
          eq(monthlyPcbRecords.userId, session.user.id)
        )
      );

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error fetching PCB record:", error);
    return NextResponse.json(
      { error: "Failed to fetch PCB record" },
      { status: 500 }
    );
  }
}

// PATCH /api/pcb/[id] - Update a PCB record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Verify ownership
    const [existing] = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.id, id),
          eq(monthlyPcbRecords.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(monthlyPcbRecords)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(monthlyPcbRecords.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating PCB record:", error);
    return NextResponse.json(
      { error: "Failed to update PCB record" },
      { status: 500 }
    );
  }
}

// DELETE /api/pcb/[id] - Delete a PCB record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.id, id),
          eq(monthlyPcbRecords.userId, session.user.id)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await db
      .delete(monthlyPcbRecords)
      .where(eq(monthlyPcbRecords.id, id));

    return NextResponse.json({
      success: true,
      message: "PCB record deleted",
    });
  } catch (error) {
    console.error("Error deleting PCB record:", error);
    return NextResponse.json(
      { error: "Failed to delete PCB record" },
      { status: 500 }
    );
  }
}
