/**
 * Tax Retriever
 * 
 * Retrieves and analyzes tax data for AI context.
 * Focused on Malaysia LHDN tax reliefs, deductions, PCB tracking,
 * and tax optimization opportunities.
 */

import { db } from "@/db";
import {
  taxDeductions,
  taxYears,
  monthlyPcbRecords,
  lhdnReliefCategories,
  transactions,
  users,
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, sum } from "drizzle-orm";
import {
  DataRetriever,
  RetrievedData,
  RetrievalOptions,
  SchemaMetadata,
  QueryIntent,
  TaxDeductionData,
  DateRange,
  getDateRangePreset,
  formatCurrency,
} from "./types";

// Malaysia tax brackets for 2024
const MALAYSIA_TAX_BRACKETS_2024 = [
  { min: 0, max: 5000, rate: 0 },
  { min: 5001, max: 20000, rate: 1 },
  { min: 20001, max: 35000, rate: 3 },
  { min: 35001, max: 50000, rate: 6 },
  { min: 50001, max: 70000, rate: 11 },
  { min: 70001, max: 100000, rate: 19 },
  { min: 100001, max: 400000, rate: 25 },
  { min: 400001, max: 600000, rate: 26 },
  { min: 600001, max: 2000000, rate: 28 },
  { min: 2000001, max: Infinity, rate: 30 },
];

interface TaxSummary {
  totalReliefs: number;
  totalDeductions: number;
  usedReliefsByCategory: Record<string, { used: number; limit: number; remaining: number }>;
  potentialSavings: number;
  estimatedTaxBracket: number;
  pcbPaid: number;
  estimatedTaxPayable: number;
  projectedRefundOrOwed: number;
}

interface ReliefOpportunity {
  category: string;
  categoryCode: string;
  description: string;
  maxLimit: number;
  currentUsed: number;
  remaining: number;
  potentialSavings: number;
  requirements?: string[];
}

export class TaxRetriever implements DataRetriever {
  name = "tax";
  description = "Retrieves tax deductions, LHDN relief categories, PCB records, and tax optimization opportunities for Malaysian tax filing";

  /**
   * Retrieve tax data with optimization insights
   */
  async retrieve(
    userId: string,
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedData> {
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear; // YA 2024 for income earned in 2024

    // Get user's income information
    const userInfo = await db
      .select({
        annualIncome: users.annualIncome,
        maritalStatus: users.maritalStatus,
        numberOfDependents: users.numberOfDependents,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const annualIncome = parseFloat(userInfo[0]?.annualIncome || "0");
    const maritalStatus = userInfo[0]?.maritalStatus || "single";

    // Get all tax deductions for the year
    const deductions = await db
      .select({
        id: taxDeductions.id,
        category: taxDeductions.category,
        lhdnCategory: taxDeductions.lhdnCategory,
        amount: taxDeductions.amount,
        claimableAmount: taxDeductions.claimableAmount,
        maxAmount: taxDeductions.maxAmount,
        description: taxDeductions.description,
        dateIncurred: taxDeductions.dateIncurred,
        forSelf: taxDeductions.forSelf,
        forSpouse: taxDeductions.forSpouse,
        forChild: taxDeductions.forChild,
        forParent: taxDeductions.forParent,
        verified: taxDeductions.verified,
      })
      .from(taxDeductions)
      .where(
        and(
          eq(taxDeductions.userId, userId),
          eq(taxDeductions.year, taxYear)
        )
      )
      .orderBy(desc(taxDeductions.dateIncurred));

    // Get LHDN relief categories for reference
    const reliefCategories = await db
      .select({
        id: lhdnReliefCategories.id,
        code: lhdnReliefCategories.code,
        name: lhdnReliefCategories.name,
        maxAmount: lhdnReliefCategories.maxAmount,
        description: lhdnReliefCategories.description,
        reliefType: lhdnReliefCategories.reliefType,
        applicableTo: lhdnReliefCategories.applicableTo,
        requiresReceipt: lhdnReliefCategories.requiresReceipt,
      })
      .from(lhdnReliefCategories)
      .where(eq(lhdnReliefCategories.isActive, true));

    // Get PCB records for the year
    const pcbRecords = await db
      .select({
        month: monthlyPcbRecords.month,
        pcbAmount: monthlyPcbRecords.pcbAmount,
        totalIncome: monthlyPcbRecords.totalIncome,
        epfEmployee: monthlyPcbRecords.epfEmployee,
        socso: monthlyPcbRecords.socso,
        eis: monthlyPcbRecords.eis,
        zakat: monthlyPcbRecords.zakat,
      })
      .from(monthlyPcbRecords)
      .where(
        and(
          eq(monthlyPcbRecords.userId, userId),
          eq(monthlyPcbRecords.year, taxYear)
        )
      )
      .orderBy(monthlyPcbRecords.month);

    // Get tax-deductible transactions that might not be claimed yet
    const unclaimedTaxTransactions = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        taxCategory: transactions.taxCategory,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isTaxDeductible, true),
          sql`${transactions.taxDeductionId} IS NULL`,
          gte(transactions.date, new Date(taxYear, 0, 1)),
          lte(transactions.date, new Date(taxYear, 11, 31))
        )
      );

    // Calculate tax summary
    const taxSummary = this.calculateTaxSummary(
      deductions,
      pcbRecords,
      reliefCategories,
      annualIncome,
      maritalStatus
    );

    // Identify relief opportunities
    const reliefOpportunities = this.identifyReliefOpportunities(
      deductions,
      reliefCategories,
      taxSummary.estimatedTaxBracket,
      maritalStatus
    );

    // Transform deductions to TaxDeductionData
    const taxDeductionData: TaxDeductionData[] = deductions.map((d) => ({
      id: d.id,
      category: d.lhdnCategory || d.category,
      categoryCode: d.category,
      claimableAmount: parseFloat(d.claimableAmount || d.amount || "0"),
      maxLimit: parseFloat(d.maxAmount || "0"),
      remainingLimit: Math.max(
        0,
        parseFloat(d.maxAmount || "0") - parseFloat(d.claimableAmount || d.amount || "0")
      ),
      utilizationPercent: d.maxAmount
        ? (parseFloat(d.claimableAmount || d.amount || "0") / parseFloat(d.maxAmount)) * 100
        : 100,
      eligibleTransactions: 1,
      potentialSavings: this.calculateTaxSavings(
        parseFloat(d.claimableAmount || d.amount || "0"),
        taxSummary.estimatedTaxBracket
      ),
      description: d.description || "",
    }));

    // Generate insights
    const insights = this.generateInsights(
      taxSummary,
      reliefOpportunities,
      unclaimedTaxTransactions.length,
      pcbRecords.length
    );

    return {
      source: this.name,
      description: `Tax data for YA ${taxYear} with ${deductions.length} claimed deductions and ${reliefOpportunities.length} optimization opportunities`,
      recordCount: deductions.length,
      dateRange: {
        start: new Date(taxYear, 0, 1),
        end: new Date(taxYear, 11, 31),
        label: `YA ${taxYear}`,
      },
      data: taxDeductionData,
      aggregations: {
        taxYear,
        annualIncome: formatCurrency(annualIncome),
        totalReliefsClaimed: formatCurrency(taxSummary.totalReliefs),
        totalDeductions: formatCurrency(taxSummary.totalDeductions),
        estimatedTaxBracket: `${taxSummary.estimatedTaxBracket}%`,
        totalPcbPaid: formatCurrency(taxSummary.pcbPaid),
        estimatedTaxPayable: formatCurrency(taxSummary.estimatedTaxPayable),
        projectedRefundOrOwed: taxSummary.projectedRefundOrOwed >= 0
          ? `Refund: ${formatCurrency(taxSummary.projectedRefundOrOwed)}`
          : `Owe: ${formatCurrency(Math.abs(taxSummary.projectedRefundOrOwed))}`,
        potentialAdditionalSavings: formatCurrency(taxSummary.potentialSavings),
        unclaimedTransactions: unclaimedTaxTransactions.length,
        reliefOpportunitiesCount: reliefOpportunities.length,
      },
      insights,
      schema: this.getSchema(),
      // Include additional data for comprehensive analysis
      relevanceScore: 0.95,
    };
  }

  /**
   * Calculate comprehensive tax summary
   */
  private calculateTaxSummary(
    deductions: any[],
    pcbRecords: any[],
    reliefCategories: any[],
    annualIncome: number,
    maritalStatus: string
  ): TaxSummary {
    // Sum up all reliefs by category
    const usedReliefsByCategory: Record<string, { used: number; limit: number; remaining: number }> = {};
    let totalReliefs = 0;

    deductions.forEach((d) => {
      const amount = parseFloat(d.claimableAmount || d.amount || "0");
      const category = d.lhdnCategory || d.category;
      
      if (!usedReliefsByCategory[category]) {
        const reliefCat = reliefCategories.find((r) => r.code === d.category || r.name === category);
        const limit = parseFloat(reliefCat?.maxAmount || "0");
        usedReliefsByCategory[category] = { used: 0, limit, remaining: limit };
      }
      
      usedReliefsByCategory[category].used += amount;
      usedReliefsByCategory[category].remaining = Math.max(
        0,
        usedReliefsByCategory[category].limit - usedReliefsByCategory[category].used
      );
      totalReliefs += amount;
    });

    // Add automatic reliefs (personal relief RM9,000)
    const personalRelief = 9000;
    totalReliefs += personalRelief;

    // Calculate EPF from PCB records (max RM4,000)
    const totalEpf = pcbRecords.reduce(
      (sum, r) => sum + parseFloat(r.epfEmployee || "0"),
      0
    );
    const epfRelief = Math.min(totalEpf, 4000);
    totalReliefs += epfRelief;

    // Calculate SOCSO (max RM350)
    const totalSocso = pcbRecords.reduce(
      (sum, r) => sum + parseFloat(r.socso || "0"),
      0
    );
    const socsoRelief = Math.min(totalSocso, 350);
    totalReliefs += socsoRelief;

    // Spouse relief if married
    if (maritalStatus === "married") {
      totalReliefs += 4000; // Spouse relief
    }

    // Calculate chargeable income
    const chargeableIncome = Math.max(0, annualIncome - totalReliefs);

    // Determine tax bracket
    const taxBracket = MALAYSIA_TAX_BRACKETS_2024.find(
      (b) => chargeableIncome >= b.min && chargeableIncome <= b.max
    );
    const estimatedTaxBracket = taxBracket?.rate || 0;

    // Calculate estimated tax payable
    const estimatedTaxPayable = this.calculateTaxPayable(chargeableIncome);

    // Sum PCB paid
    const pcbPaid = pcbRecords.reduce(
      (sum, r) => sum + parseFloat(r.pcbAmount || "0"),
      0
    );

    // Calculate potential additional savings from unused reliefs
    let potentialSavings = 0;
    reliefCategories.forEach((cat) => {
      const used = usedReliefsByCategory[cat.name]?.used || 0;
      const limit = parseFloat(cat.maxAmount || "0");
      const remaining = Math.max(0, limit - used);
      if (remaining > 0) {
        potentialSavings += this.calculateTaxSavings(remaining, estimatedTaxBracket);
      }
    });

    return {
      totalReliefs,
      totalDeductions: totalReliefs - personalRelief - epfRelief - socsoRelief,
      usedReliefsByCategory,
      potentialSavings,
      estimatedTaxBracket,
      pcbPaid,
      estimatedTaxPayable,
      projectedRefundOrOwed: pcbPaid - estimatedTaxPayable,
    };
  }

  /**
   * Calculate tax payable based on Malaysian tax brackets
   */
  private calculateTaxPayable(chargeableIncome: number): number {
    let tax = 0;
    let remainingIncome = chargeableIncome;

    for (const bracket of MALAYSIA_TAX_BRACKETS_2024) {
      if (remainingIncome <= 0) break;

      const bracketSize = bracket.max === Infinity 
        ? remainingIncome 
        : Math.min(remainingIncome, bracket.max - bracket.min + 1);

      if (chargeableIncome > bracket.min) {
        const taxableInBracket = Math.min(
          bracketSize,
          chargeableIncome - bracket.min
        );
        tax += (taxableInBracket * bracket.rate) / 100;
        remainingIncome -= taxableInBracket;
      }
    }

    return Math.max(0, tax);
  }

  /**
   * Calculate tax savings for a given relief amount
   */
  private calculateTaxSavings(reliefAmount: number, taxBracket: number): number {
    return (reliefAmount * taxBracket) / 100;
  }

  /**
   * Identify relief opportunities the user hasn't fully utilized
   */
  private identifyReliefOpportunities(
    deductions: any[],
    reliefCategories: any[],
    taxBracket: number,
    maritalStatus: string
  ): ReliefOpportunity[] {
    const opportunities: ReliefOpportunity[] = [];

    // Calculate used amounts per category
    const usedByCategory: Record<string, number> = {};
    deductions.forEach((d) => {
      const cat = d.category;
      usedByCategory[cat] = (usedByCategory[cat] || 0) + parseFloat(d.amount || "0");
    });

    // Key reliefs to highlight for Malaysians
    const keyReliefs = [
      { code: "LIFESTYLE", name: "Lifestyle Relief", limit: 2500, description: "Books, sports equipment, computers, smartphones, internet, gym memberships" },
      { code: "MEDICAL_SELF", name: "Medical Expenses (Self)", limit: 10000, description: "Medical treatment, vaccination, mental health" },
      { code: "MEDICAL_PARENTS", name: "Medical Parents", limit: 8000, description: "Medical expenses for parents" },
      { code: "EDUCATION_SELF", name: "Education (Self)", limit: 7000, description: "Fees for upskilling, professional courses, postgraduate education" },
      { code: "SSPN", name: "SSPN Education Savings", limit: 8000, description: "Deposits to SSPN for children's education" },
      { code: "INSURANCE_LIFE", name: "Life Insurance", limit: 3000, description: "Life insurance premiums (conventional)" },
      { code: "INSURANCE_EDUCATION", name: "Education Insurance", limit: 3000, description: "Education or medical insurance premiums" },
      { code: "PRS", name: "Private Retirement Scheme", limit: 3000, description: "Contributions to PRS" },
      { code: "CHILD", name: "Child Relief", limit: 8000, description: "Per child under 18, or studying full-time" },
      { code: "DISABLED_CHILD", name: "Disabled Child Relief", limit: 14000, description: "Per disabled child" },
      { code: "BREASTFEEDING", name: "Breastfeeding Equipment", limit: 1000, description: "For mothers with children under 2 (once every 2 years)" },
      { code: "CHILDCARE", name: "Childcare Fees", limit: 3000, description: "Registered childcare or kindergarten fees" },
      { code: "EV_CHARGING", name: "EV Charging Equipment", limit: 2500, description: "Purchase and installation of EV charging equipment" },
    ];

    keyReliefs.forEach((relief) => {
      const used = usedByCategory[relief.code] || 0;
      const remaining = Math.max(0, relief.limit - used);

      if (remaining > 0) {
        opportunities.push({
          category: relief.name,
          categoryCode: relief.code,
          description: relief.description,
          maxLimit: relief.limit,
          currentUsed: used,
          remaining,
          potentialSavings: this.calculateTaxSavings(remaining, taxBracket),
        });
      }
    });

    // Sort by potential savings
    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Generate insights from tax data
   */
  private generateInsights(
    summary: TaxSummary,
    opportunities: ReliefOpportunity[],
    unclaimedCount: number,
    pcbMonthsRecorded: number
  ): string[] {
    const insights: string[] = [];

    // Refund or owe status
    if (summary.projectedRefundOrOwed > 0) {
      insights.push(
        `💰 Projected tax refund: ${formatCurrency(summary.projectedRefundOrOwed)} based on PCB paid vs estimated tax`
      );
    } else if (summary.projectedRefundOrOwed < 0) {
      insights.push(
        `⚠️ You may owe ${formatCurrency(Math.abs(summary.projectedRefundOrOwed))} additional tax. Consider maximizing reliefs before year-end.`
      );
    }

    // Tax bracket insight
    insights.push(
      `📊 Current tax bracket: ${summary.estimatedTaxBracket}%. Every RM1,000 in additional reliefs saves you RM${(summary.estimatedTaxBracket * 10).toFixed(0)}`
    );

    // Top opportunities
    const topOpportunities = opportunities.slice(0, 3);
    if (topOpportunities.length > 0) {
      const totalPotential = topOpportunities.reduce((sum, o) => sum + o.potentialSavings, 0);
      insights.push(
        `💡 Top 3 unused reliefs could save you ${formatCurrency(totalPotential)} in taxes`
      );

      topOpportunities.forEach((opp) => {
        insights.push(
          `  • ${opp.category}: ${formatCurrency(opp.remaining)} remaining (saves ${formatCurrency(opp.potentialSavings)})`
        );
      });
    }

    // Unclaimed transactions
    if (unclaimedCount > 0) {
      insights.push(
        `📋 ${unclaimedCount} tax-deductible transaction(s) haven't been linked to relief claims yet`
      );
    }

    // PCB tracking
    if (pcbMonthsRecorded < 12) {
      insights.push(
        `📝 PCB records for ${pcbMonthsRecorded}/12 months. Complete records help accurate tax estimation.`
      );
    }

    return insights;
  }

  /**
   * Get schema metadata for LLM understanding
   */
  getSchema(): SchemaMetadata {
    return {
      tableName: "tax_deductions",
      description:
        "Malaysian LHDN tax reliefs, deductions, and PCB (Monthly Tax Deduction) records. Covers all YA 2024 relief categories for personal income tax filing.",
      columns: [
        { name: "id", type: "uuid", description: "Unique tax deduction identifier" },
        { name: "year", type: "integer", description: "Assessment year (YA)" },
        { name: "category", type: "varchar", description: "LHDN relief category code", sampleValues: ["LIFESTYLE", "MEDICAL_SELF", "EDUCATION_SELF", "SSPN", "EPF"] },
        { name: "lhdnCategory", type: "varchar", description: "Human-readable LHDN category name" },
        { name: "amount", type: "decimal", description: "Amount claimed in MYR" },
        { name: "claimableAmount", type: "decimal", description: "Amount after limits applied" },
        { name: "maxAmount", type: "decimal", description: "Maximum limit for this relief category" },
        { name: "forSelf", type: "boolean", description: "Whether expense is for taxpayer" },
        { name: "forSpouse", type: "boolean", description: "Whether expense is for spouse" },
        { name: "forChild", type: "boolean", description: "Whether expense is for children" },
        { name: "forParent", type: "boolean", description: "Whether expense is for parents" },
        { name: "verified", type: "boolean", description: "Whether documentation is verified" },
      ],
      relationships: [
        {
          relatedTable: "lhdn_relief_categories",
          joinColumn: "lhdnCategoryId",
          description: "Links to official LHDN relief category definition",
        },
        {
          relatedTable: "transactions",
          joinColumn: "transactionId",
          description: "Links to source transaction if applicable",
        },
        {
          relatedTable: "tax_years",
          joinColumn: "taxYearId",
          description: "Links to user's tax year summary",
        },
      ],
    };
  }

  /**
   * Check if relevant for given intent
   */
  isRelevantFor(intent: QueryIntent): boolean {
    const relevantIntents: QueryIntent[] = [
      "tax_optimization",
      "spending_analysis",
      "general_advice",
    ];
    return relevantIntents.includes(intent);
  }
}
