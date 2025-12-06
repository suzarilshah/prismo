/**
 * Tax Data Seed Script for Sharifah Azhar
 * Adds comprehensive Malaysian tax relief data for 2023, 2024, 2025
 * 
 * Run with: npx tsx db/seed-tax-data.ts
 */

import { db } from "./index";
import { users, taxDeductions, taxYears } from "./schema";
import { eq } from "drizzle-orm";

const USER_EMAIL = "yuurimikasa@gmail.com";

// Malaysian LHDN Tax Relief Categories for 2023-2025
// Based on actual Malaysian tax relief guidelines
const TAX_RELIEF_DATA = {
  2023: [
    // Individual Relief (Automatic)
    { category: "individual_relief", lhdnCategory: "Individual Relief", amount: "9000.00", description: "Individual and Dependent Relatives", maxAmount: "9000.00", forSelf: true },
    
    // EPF/KWSP Contribution
    { category: "epf", lhdnCategory: "EPF Contribution", amount: "42000.00", description: "EPF Employee Contribution (11% of RM35,000 x 12)", maxAmount: "4000.00", forSelf: true },
    
    // Life Insurance & Takaful
    { category: "life_insurance", lhdnCategory: "Life Insurance Premium", amount: "4800.00", description: "Prudential PRULife Premium", maxAmount: "3000.00", forSelf: true },
    
    // Medical & Education Insurance
    { category: "medical_insurance", lhdnCategory: "Medical Insurance Premium", amount: "4200.00", description: "AIA Medical Card A-Plus", maxAmount: "3000.00", forSelf: true },
    
    // SSPN (National Education Savings Scheme)
    { category: "sspn", lhdnCategory: "SSPN Contribution", amount: "6000.00", description: "SSPN-i Plus - Nur Aisyah", maxAmount: "8000.00", forChild: true },
    
    // Child Education (Primary/Secondary) - Under 18
    { category: "child_education", lhdnCategory: "Child Education (Under 18)", amount: "32000.00", description: "Sri KDU International School Fees", maxAmount: "8000.00", forChild: true },
    
    // Lifestyle (Books, Sports Equipment, Gym)
    { category: "lifestyle", lhdnCategory: "Lifestyle", amount: "2256.00", description: "Gym Membership (Celebrity Fitness)", maxAmount: "2500.00", forSelf: true },
    
    // Self Education
    { category: "education_self", lhdnCategory: "Education (Self)", amount: "2800.00", description: "Professional Development Courses", maxAmount: "7000.00", forSelf: true },
    
    // Medical Expenses (Self)
    { category: "medical_self", lhdnCategory: "Medical Expenses (Self)", amount: "1100.00", description: "Medical checkups and treatments", maxAmount: "8000.00", forSelf: true },
    
    // Medical Expenses (Parents)
    { category: "medical_parents", lhdnCategory: "Medical Expenses (Parents)", amount: "3500.00", description: "Parents' medical treatment", maxAmount: "8000.00", forParent: true },
    
    // Spouse (No income or joint assessment)
    { category: "spouse_relief", lhdnCategory: "Spouse Relief", amount: "4000.00", description: "Husband Ahmad Razali (separate assessment)", maxAmount: "4000.00", forSpouse: true },
    
    // Child Relief
    { category: "child_relief", lhdnCategory: "Child Relief (Under 18)", amount: "2000.00", description: "Nur Aisyah (5 years old)", maxAmount: "2000.00", forChild: true },
    
    // Donations to Approved Institutions
    { category: "donations", lhdnCategory: "Approved Donations", amount: "2200.00", description: "Charitable donations (YB, Mercy Malaysia)", maxAmount: null, forSelf: true },
    
    // Private Retirement Scheme (PRS)
    { category: "prs", lhdnCategory: "Private Retirement Scheme", amount: "3000.00", description: "Affin Hwang PRS Contributions", maxAmount: "3000.00", forSelf: true },
    
    // SOCSO Contribution
    { category: "socso", lhdnCategory: "SOCSO Contribution", amount: "1500.00", description: "Social Security Contribution", maxAmount: "350.00", forSelf: true },
  ],
  
  2024: [
    // Individual Relief (Automatic)
    { category: "individual_relief", lhdnCategory: "Individual Relief", amount: "9000.00", description: "Individual and Dependent Relatives", maxAmount: "9000.00", forSelf: true },
    
    // EPF/KWSP Contribution
    { category: "epf", lhdnCategory: "EPF Contribution", amount: "46200.00", description: "EPF Employee Contribution (11% of RM35,000 x 12)", maxAmount: "4000.00", forSelf: true },
    
    // Life Insurance & Takaful
    { category: "life_insurance", lhdnCategory: "Life Insurance Premium", amount: "5400.00", description: "Prudential PRULife Premium", maxAmount: "3000.00", forSelf: true },
    
    // Medical & Education Insurance
    { category: "medical_insurance", lhdnCategory: "Medical Insurance Premium", amount: "4560.00", description: "AIA Medical Card A-Plus", maxAmount: "3000.00", forSelf: true },
    
    // SSPN (National Education Savings Scheme)
    { category: "sspn", lhdnCategory: "SSPN Contribution", amount: "6000.00", description: "SSPN-i Plus - Nur Aisyah", maxAmount: "8000.00", forChild: true },
    
    // Child Education
    { category: "child_education", lhdnCategory: "Child Education (Under 18)", amount: "38400.00", description: "Sri KDU International School Fees", maxAmount: "8000.00", forChild: true },
    
    // Lifestyle
    { category: "lifestyle", lhdnCategory: "Lifestyle", amount: "2256.00", description: "Gym Membership (Celebrity Fitness)", maxAmount: "2500.00", forSelf: true },
    
    // Self Education
    { category: "education_self", lhdnCategory: "Education (Self)", amount: "3500.00", description: "Cloud Architecture Certification, AWS Training", maxAmount: "7000.00", forSelf: true },
    
    // Medical Expenses (Self)
    { category: "medical_self", lhdnCategory: "Medical Expenses (Self)", amount: "1200.00", description: "Medical checkups and treatments", maxAmount: "10000.00", forSelf: true },
    
    // Medical Expenses (Parents)
    { category: "medical_parents", lhdnCategory: "Medical Expenses (Parents)", amount: "4200.00", description: "Parents' medical treatment and care", maxAmount: "8000.00", forParent: true },
    
    // Spouse Relief
    { category: "spouse_relief", lhdnCategory: "Spouse Relief", amount: "4000.00", description: "Husband Ahmad Razali (separate assessment)", maxAmount: "4000.00", forSpouse: true },
    
    // Child Relief
    { category: "child_relief", lhdnCategory: "Child Relief (Under 18)", amount: "2000.00", description: "Nur Aisyah (6 years old)", maxAmount: "2000.00", forChild: true },
    
    // Donations
    { category: "donations", lhdnCategory: "Approved Donations", amount: "2500.00", description: "Charitable donations (YB, Mercy Malaysia, Tabung Harapan)", maxAmount: null, forSelf: true },
    
    // Private Retirement Scheme (PRS)
    { category: "prs", lhdnCategory: "Private Retirement Scheme", amount: "3000.00", description: "Affin Hwang PRS Contributions", maxAmount: "3000.00", forSelf: true },
    
    // SOCSO Contribution
    { category: "socso", lhdnCategory: "SOCSO Contribution", amount: "1680.00", description: "Social Security Contribution", maxAmount: "350.00", forSelf: true },
    
    // EV Charging - New for 2024
    { category: "ev_charging", lhdnCategory: "EV Charging Facilities", amount: "2500.00", description: "Home EV Charger Installation", maxAmount: "2500.00", forSelf: true },
    
    // Childcare Relief (Child under 6)
    { category: "childcare", lhdnCategory: "Childcare Centre Fees", amount: "0.00", description: "Nur Aisyah now in primary school", maxAmount: "3000.00", forChild: true },
    
    // Breastfeeding Equipment (Not applicable - child over 2)
    
    // Disabled Equipment (Not applicable)
  ],
  
  2025: [
    // Individual Relief (Automatic)
    { category: "individual_relief", lhdnCategory: "Individual Relief", amount: "9000.00", description: "Individual and Dependent Relatives", maxAmount: "9000.00", forSelf: true },
    
    // EPF/KWSP Contribution (Salary increased)
    { category: "epf", lhdnCategory: "EPF Contribution", amount: "50400.00", description: "EPF Employee Contribution (11% of RM38,000 x 12)", maxAmount: "4000.00", forSelf: true },
    
    // Life Insurance & Takaful
    { category: "life_insurance", lhdnCategory: "Life Insurance Premium", amount: "5800.00", description: "Prudential PRULife Premium (upgraded plan)", maxAmount: "3000.00", forSelf: true },
    
    // Medical & Education Insurance
    { category: "medical_insurance", lhdnCategory: "Medical Insurance Premium", amount: "4800.00", description: "AIA Medical Card A-Plus", maxAmount: "3000.00", forSelf: true },
    
    // SSPN
    { category: "sspn", lhdnCategory: "SSPN Contribution", amount: "8000.00", description: "SSPN-i Plus - Nur Aisyah (increased)", maxAmount: "8000.00", forChild: true },
    
    // Child Education
    { category: "child_education", lhdnCategory: "Child Education (Under 18)", amount: "42000.00", description: "Sri KDU International School Fees (Year 2)", maxAmount: "8000.00", forChild: true },
    
    // Lifestyle
    { category: "lifestyle", lhdnCategory: "Lifestyle", amount: "2500.00", description: "Gym Membership + Sports Equipment", maxAmount: "2500.00", forSelf: true },
    
    // Self Education
    { category: "education_self", lhdnCategory: "Education (Self)", amount: "5500.00", description: "MBA Executive Program (First Year)", maxAmount: "7000.00", forSelf: true },
    
    // Medical Expenses (Self)
    { category: "medical_self", lhdnCategory: "Medical Expenses (Self)", amount: "1500.00", description: "Annual health screening, dental", maxAmount: "10000.00", forSelf: true },
    
    // Medical Expenses (Parents)
    { category: "medical_parents", lhdnCategory: "Medical Expenses (Parents)", amount: "5500.00", description: "Parents' medical treatment", maxAmount: "8000.00", forParent: true },
    
    // Spouse Relief
    { category: "spouse_relief", lhdnCategory: "Spouse Relief", amount: "4000.00", description: "Husband Ahmad Razali", maxAmount: "4000.00", forSpouse: true },
    
    // Child Relief
    { category: "child_relief", lhdnCategory: "Child Relief (Under 18)", amount: "2000.00", description: "Nur Aisyah (7 years old)", maxAmount: "2000.00", forChild: true },
    
    // Donations
    { category: "donations", lhdnCategory: "Approved Donations", amount: "3000.00", description: "Charitable donations", maxAmount: null, forSelf: true },
    
    // Private Retirement Scheme (PRS)
    { category: "prs", lhdnCategory: "Private Retirement Scheme", amount: "3000.00", description: "Affin Hwang PRS Contributions", maxAmount: "3000.00", forSelf: true },
    
    // SOCSO Contribution
    { category: "socso", lhdnCategory: "SOCSO Contribution", amount: "1800.00", description: "Social Security Contribution", maxAmount: "350.00", forSelf: true },
    
    // EV Charging
    { category: "ev_charging", lhdnCategory: "EV Charging Facilities", amount: "0.00", description: "Already claimed in 2024", maxAmount: "2500.00", forSelf: true },
    
    // Internet Subscription (New for 2025)
    { category: "internet", lhdnCategory: "Internet Subscription", amount: "2388.00", description: "Unifi 500Mbps Annual", maxAmount: "2500.00", forSelf: true },
    
    // Domestic Travel (Malaysia)
    { category: "domestic_travel", lhdnCategory: "Domestic Tourism", amount: "1500.00", description: "Langkawi family trip", maxAmount: "1000.00", forSelf: true },
  ],
};

// Calculate claimable amount (respecting LHDN limits)
function calculateClaimable(amount: string, maxAmount: string | null): string {
  if (!maxAmount) return amount; // No limit (e.g., donations)
  const amountNum = parseFloat(amount);
  const maxNum = parseFloat(maxAmount);
  return Math.min(amountNum, maxNum).toFixed(2);
}

async function seedTaxData() {
  console.log("🧾 Starting tax data seed for Sharifah Azhar...\n");

  try {
    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, USER_EMAIL),
    });

    if (!user) {
      console.error("❌ User not found:", USER_EMAIL);
      process.exit(1);
    }

    console.log(`1️⃣ Found user: ${user.name} (${user.id})`);

    // Delete existing tax deductions for this user
    console.log("\n2️⃣ Clearing existing tax deductions...");
    await db.delete(taxDeductions).where(eq(taxDeductions.userId, user.id));

    // Seed tax years
    console.log("\n3️⃣ Creating tax years...");
    for (const year of [2023, 2024, 2025]) {
      const existingYear = await db.query.taxYears.findFirst({
        where: eq(taxYears.year, year),
      });
      
      if (!existingYear) {
        await db.insert(taxYears).values({
          userId: user.id,
          year,
          filingStatus: year === 2025 ? "draft" : "filed",
          filedAt: year === 2025 ? null : new Date(`${year + 1}-03-15`),
        });
      }
    }

    // Seed tax deductions for each year
    let totalDeductions = 0;
    for (const [yearStr, deductions] of Object.entries(TAX_RELIEF_DATA)) {
      const year = parseInt(yearStr);
      console.log(`\n4️⃣ Seeding ${year} tax deductions (${deductions.length} items)...`);

      for (const deduction of deductions) {
        const claimableAmount = calculateClaimable(deduction.amount, deduction.maxAmount);
        
        await db.insert(taxDeductions).values({
          userId: user.id,
          year,
          category: deduction.category,
          lhdnCategory: deduction.lhdnCategory,
          amount: deduction.amount,
          maxAmount: deduction.maxAmount,
          claimableAmount,
          description: deduction.description,
          forSelf: deduction.forSelf || false,
          forSpouse: deduction.forSpouse || false,
          forChild: deduction.forChild || false,
          forParent: deduction.forParent || false,
          verified: year !== 2025, // 2025 still in progress
          verifiedAt: year !== 2025 ? new Date() : null,
          dateIncurred: new Date(`${year}-06-15`), // Mid-year estimate
        });
        
        totalDeductions++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 TAX DATA SEED COMPLETED!");
    console.log("=".repeat(50));
    console.log(`
📊 Summary:
   - User: ${user.name} (${USER_EMAIL})
   - Total Deductions Created: ${totalDeductions}
   
   Year-by-Year Breakdown:
   - 2023: ${TAX_RELIEF_DATA[2023].length} relief items
   - 2024: ${TAX_RELIEF_DATA[2024].length} relief items
   - 2025: ${TAX_RELIEF_DATA[2025].length} relief items
   
💡 Tax relief data includes:
   - EPF/KWSP contributions
   - Insurance premiums (Life + Medical)
   - SSPN education savings
   - Child education fees
   - Medical expenses (self, spouse, parents)
   - Lifestyle expenses
   - Donations
   - Private Retirement Scheme (PRS)
   - And more...
`);

  } catch (error) {
    console.error("❌ Error seeding tax data:", error);
    throw error;
  }
}

seedTaxData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
