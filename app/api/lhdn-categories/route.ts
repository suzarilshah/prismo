import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lhdnReliefCategories } from "@/db/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { LHDN_RELIEF_CATEGORIES, getActiveCategoriesForYear, calculateMalaysianTax } from "@/db/seed-lhdn-categories";

// GET /api/lhdn-categories - Get all LHDN relief categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const type = searchParams.get("type"); // 'relief', 'deduction', 'rebate'
    const fromDb = searchParams.get("fromDb") === "true";

    if (fromDb) {
      // Fetch from database
      const conditions = [eq(lhdnReliefCategories.isActive, true)];
      
      if (type) {
        conditions.push(eq(lhdnReliefCategories.reliefType, type));
      }

      // Filter by year validity
      conditions.push(
        or(
          isNull(lhdnReliefCategories.validFromYear),
          lte(lhdnReliefCategories.validFromYear, year)
        )!
      );
      conditions.push(
        or(
          isNull(lhdnReliefCategories.validUntilYear),
          gte(lhdnReliefCategories.validUntilYear, year)
        )!
      );

      const categories = await db
        .select()
        .from(lhdnReliefCategories)
        .where(and(...conditions))
        .orderBy(lhdnReliefCategories.sortOrder);

      return NextResponse.json({
        success: true,
        data: categories,
        year,
      });
    } else {
      // Return from static data (faster, no DB round-trip)
      let categories = getActiveCategoriesForYear(year);
      
      if (type) {
        categories = categories.filter(cat => cat.reliefType === type);
      }

      return NextResponse.json({
        success: true,
        data: categories,
        year,
      });
    }
  } catch (error) {
    console.error("Error fetching LHDN categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch LHDN categories" },
      { status: 500 }
    );
  }
}

// POST /api/lhdn-categories/seed - Seed LHDN categories to database
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check for existing categories
    const existing = await db.select().from(lhdnReliefCategories).limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Categories already seeded. Use force=true to reseed.",
      });
    }

    // Insert all categories
    const inserted = await db
      .insert(lhdnReliefCategories)
      .values(
        LHDN_RELIEF_CATEGORIES.map(cat => ({
          code: cat.code,
          name: cat.name,
          nameMs: cat.nameMs,
          description: cat.description,
          maxAmount: cat.maxAmount?.toString() || null,
          reliefType: cat.reliefType,
          applicableTo: cat.applicableTo,
          requiresReceipt: cat.requiresReceipt,
          requiresVerification: cat.requiresVerification,
          validFromYear: cat.validFromYear,
          validUntilYear: cat.validUntilYear,
          conditions: cat.conditions || null,
          sortOrder: cat.sortOrder,
          isActive: true,
        }))
      )
      .returning();

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted.length} LHDN relief categories`,
      data: inserted,
    });
  } catch (error) {
    console.error("Error seeding LHDN categories:", error);
    return NextResponse.json(
      { error: "Failed to seed LHDN categories" },
      { status: 500 }
    );
  }
}
