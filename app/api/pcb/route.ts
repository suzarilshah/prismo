import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyPcbRecords, taxYears, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

const pcbSchema = z.object({
  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12),
  grossSalary: z.string().optional().nullable(),
  bonus: z.string().optional().nullable(),
  allowances: z.string().optional().nullable(),
  commission: z.string().optional().nullable(),
  totalIncome: z.string().optional().nullable(),
  epfEmployee: z.string().optional().nullable(),
  socso: z.string().optional().nullable(),
  eis: z.string().optional().nullable(),
  zakat: z.string().optional().nullable(),
  pcbAmount: z.string(),
  ytdIncome: z.string().optional().nullable(),
  ytdPcb: z.string().optional().nullable(),
  ytdEpf: z.string().optional().nullable(),
  payslipUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Helper to get user ID from session or demo user
async function getUserId(authUser: any): Promise<string | null> {
  if (authUser?.id) {
    return authUser.id;
  }
  // Fallback to demo user for development
  const [demoUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "demo@prismofinance.com"))
    .limit(1);
  return demoUser?.id || null;
}

// GET /api/pcb - Get PCB records for a year
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const userId = await getUserId(authUser);
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const records = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.userId, userId),
          eq(monthlyPcbRecords.year, year)
        )
      )
      .orderBy(monthlyPcbRecords.month);

    // Calculate totals
    const totals = records.reduce(
      (acc, record) => ({
        totalPcb: acc.totalPcb + parseFloat(record.pcbAmount || "0"),
        totalEpf: acc.totalEpf + parseFloat(record.epfEmployee || "0"),
        totalSocso: acc.totalSocso + parseFloat(record.socso || "0"),
        totalEis: acc.totalEis + parseFloat(record.eis || "0"),
        totalZakat: acc.totalZakat + parseFloat(record.zakat || "0"),
        totalIncome: acc.totalIncome + parseFloat(record.totalIncome || "0"),
      }),
      { totalPcb: 0, totalEpf: 0, totalSocso: 0, totalEis: 0, totalZakat: 0, totalIncome: 0 }
    );

    // Create a map of months with records
    const recordsByMonth: Record<number, typeof records[0]> = {};
    records.forEach((r) => {
      recordsByMonth[r.month] = r;
    });

    return NextResponse.json({
      success: true,
      data: records,
      recordsByMonth,
      totals,
      year,
      monthsRecorded: records.length,
    });
  } catch (error) {
    console.error("Error fetching PCB records:", error);
    return NextResponse.json(
      { error: "Failed to fetch PCB records" },
      { status: 500 }
    );
  }
}

// POST /api/pcb - Create or update a PCB record
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const userId = await getUserId(authUser);
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    console.log("PCB POST body:", JSON.stringify(body));
    
    const validatedData = pcbSchema.parse(body);

    // Check if record already exists for this month/year
    const [existing] = await db
      .select()
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.userId, userId),
          eq(monthlyPcbRecords.year, validatedData.year),
          eq(monthlyPcbRecords.month, validatedData.month)
        )
      );

    // Get or create tax year record
    let [taxYear] = await db
      .select()
      .from(taxYears)
      .where(
        and(
          eq(taxYears.userId, userId),
          eq(taxYears.year, validatedData.year)
        )
      );

    if (!taxYear) {
      [taxYear] = await db
        .insert(taxYears)
        .values({
          userId: userId,
          year: validatedData.year,
        })
        .returning();
    }

    // Prepare record data (only include non-empty values)
    const recordData = {
      year: validatedData.year,
      month: validatedData.month,
      grossSalary: validatedData.grossSalary || null,
      bonus: validatedData.bonus || null,
      allowances: validatedData.allowances || null,
      commission: validatedData.commission || null,
      totalIncome: validatedData.totalIncome || null,
      epfEmployee: validatedData.epfEmployee || null,
      socso: validatedData.socso || null,
      eis: validatedData.eis || null,
      zakat: validatedData.zakat || null,
      pcbAmount: validatedData.pcbAmount,
      ytdIncome: validatedData.ytdIncome || null,
      ytdPcb: validatedData.ytdPcb || null,
      ytdEpf: validatedData.ytdEpf || null,
      payslipUrl: validatedData.payslipUrl || null,
      notes: validatedData.notes || null,
    };

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(monthlyPcbRecords)
        .set({
          ...recordData,
          taxYearId: taxYear.id,
          updatedAt: new Date(),
        })
        .where(eq(monthlyPcbRecords.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
        message: "PCB record updated",
      });
    } else {
      // Create new record
      const [created] = await db
        .insert(monthlyPcbRecords)
        .values({
          userId: userId,
          taxYearId: taxYear.id,
          ...recordData,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: created,
        message: "PCB record created",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("PCB validation error:", error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating PCB record:", error);
    return NextResponse.json(
      { error: "Failed to create PCB record", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
