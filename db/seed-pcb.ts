/**
 * PCB (Potongan Cukai Berjadual) Seed Data
 * 
 * Malaysian Statutory Deductions Calculator
 * Based on 2024/2025 LHDN, EPF, SOCSO, and EIS rates
 * 
 * User: yuurimikasa@gmail.com (Sharifah Azhar)
 * Monthly Salary: RM 35,000
 */

import { db } from "./index";
import { users, monthlyPcbRecords, taxYears } from "./schema";
import { eq } from "drizzle-orm";

// ============================================
// MALAYSIAN STATUTORY RATES 2024/2025
// ============================================

/**
 * EPF (KWSP) Contribution Rates
 * - Employee: 11% (mandatory)
 * - Employer: 12% for salary > RM 5,000, 13% for salary <= RM 5,000
 * - No ceiling (percentage of actual salary)
 */
function calculateEPF(grossSalary: number): { employee: number; employer: number } {
  const employeeRate = 0.11;
  const employerRate = grossSalary > 5000 ? 0.12 : 0.13;
  
  // EPF amounts are rounded to nearest RM (as per KWSP rules)
  const employee = Math.round(grossSalary * employeeRate);
  const employer = Math.round(grossSalary * employerRate);
  
  return { employee, employer };
}

/**
 * SOCSO (PERKESO) Contribution Rates - Category 1
 * Effective Nov 2024: Wage ceiling increased to RM 6,000
 * 
 * Category 1 (Employment Injury + Invalidity):
 * - Employee: ~0.5% of insured wages
 * - Employer: ~1.75% of insured wages
 * 
 * Using simplified table lookup for RM 6,000 ceiling
 */
function calculateSOCSO(grossSalary: number): { employee: number; employer: number } {
  // SOCSO wage ceiling is RM 6,000 (as of Nov 2024)
  const insuredWage = Math.min(grossSalary, 6000);
  
  // Category 1 rates (simplified) - actual rates from SOCSO table
  // For RM 6,000 ceiling: Employee RM 29.65, Employer RM 82.95
  if (insuredWage >= 5900) {
    return { employee: 29.65, employer: 82.95 };
  } else if (insuredWage >= 5700) {
    return { employee: 28.65, employer: 80.15 };
  } else if (insuredWage >= 5500) {
    return { employee: 27.65, employer: 77.35 };
  } else if (insuredWage >= 5300) {
    return { employee: 26.65, employer: 74.55 };
  } else if (insuredWage >= 5100) {
    return { employee: 25.65, employer: 71.75 };
  } else if (insuredWage >= 4900) {
    return { employee: 24.65, employer: 68.95 };
  } else if (insuredWage >= 4700) {
    return { employee: 23.65, employer: 66.15 };
  } else if (insuredWage >= 4500) {
    return { employee: 22.65, employer: 63.35 };
  } else if (insuredWage >= 4300) {
    return { employee: 21.65, employer: 60.55 };
  } else if (insuredWage >= 4100) {
    return { employee: 20.65, employer: 57.75 };
  } else if (insuredWage >= 3900) {
    return { employee: 19.65, employer: 54.95 };
  } else if (insuredWage >= 3700) {
    return { employee: 18.65, employer: 52.15 };
  } else if (insuredWage >= 3500) {
    return { employee: 17.65, employer: 49.35 };
  } else if (insuredWage >= 3300) {
    return { employee: 16.65, employer: 46.55 };
  } else if (insuredWage >= 3100) {
    return { employee: 15.65, employer: 43.75 };
  } else if (insuredWage >= 2900) {
    return { employee: 14.65, employer: 40.95 };
  } else if (insuredWage >= 2700) {
    return { employee: 13.65, employer: 38.15 };
  } else if (insuredWage >= 2500) {
    return { employee: 12.65, employer: 35.35 };
  } else if (insuredWage >= 2300) {
    return { employee: 11.65, employer: 32.55 };
  } else if (insuredWage >= 2100) {
    return { employee: 10.65, employer: 29.75 };
  } else if (insuredWage >= 1900) {
    return { employee: 9.65, employer: 26.95 };
  } else if (insuredWage >= 1700) {
    return { employee: 8.65, employer: 24.15 };
  } else if (insuredWage >= 1500) {
    return { employee: 7.65, employer: 21.35 };
  } else if (insuredWage >= 1300) {
    return { employee: 6.60, employer: 18.50 };
  } else if (insuredWage >= 1100) {
    return { employee: 5.60, employer: 15.70 };
  } else if (insuredWage >= 900) {
    return { employee: 4.60, employer: 12.90 };
  } else if (insuredWage >= 700) {
    return { employee: 3.60, employer: 10.10 };
  } else if (insuredWage >= 500) {
    return { employee: 2.60, employer: 7.30 };
  } else if (insuredWage >= 300) {
    return { employee: 1.60, employer: 4.50 };
  } else {
    return { employee: 0.80, employer: 2.20 };
  }
}

/**
 * EIS (Employment Insurance System) Contribution Rates
 * - Employee: 0.2% of insured wages
 * - Employer: 0.2% of insured wages
 * - Wage ceiling: RM 6,000 (as of Nov 2024)
 */
function calculateEIS(grossSalary: number): { employee: number; employer: number } {
  const insuredWage = Math.min(grossSalary, 6000);
  const rate = 0.002; // 0.2%
  
  // Rounded to nearest sen
  const contribution = Math.round(insuredWage * rate * 100) / 100;
  
  return { employee: contribution, employer: contribution };
}

/**
 * PCB (Monthly Tax Deduction) Calculation
 * Based on LHDN MTD formula for YA 2024/2025
 * 
 * Malaysia Income Tax Brackets 2024:
 * - First RM 5,000: 0%
 * - RM 5,001 - RM 20,000: 1%
 * - RM 20,001 - RM 35,000: 3%
 * - RM 35,001 - RM 50,000: 6%
 * - RM 50,001 - RM 70,000: 11%
 * - RM 70,001 - RM 100,000: 19%
 * - RM 100,001 - RM 400,000: 25%
 * - RM 400,001 - RM 600,000: 26%
 * - RM 600,001 - RM 2,000,000: 28%
 * - Above RM 2,000,000: 30%
 */
function calculateAnnualTax(annualChargeableIncome: number): number {
  let tax = 0;
  let remaining = annualChargeableIncome;
  
  const brackets = [
    { limit: 5000, rate: 0 },
    { limit: 20000, rate: 0.01 },
    { limit: 35000, rate: 0.03 },
    { limit: 50000, rate: 0.06 },
    { limit: 70000, rate: 0.11 },
    { limit: 100000, rate: 0.19 },
    { limit: 400000, rate: 0.25 },
    { limit: 600000, rate: 0.26 },
    { limit: 2000000, rate: 0.28 },
    { limit: Infinity, rate: 0.30 },
  ];
  
  let previousLimit = 0;
  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remaining, bracket.limit - previousLimit);
    if (taxableInBracket <= 0) break;
    
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousLimit = bracket.limit;
  }
  
  return Math.round(tax * 100) / 100;
}

function calculatePCB(
  grossMonthlySalary: number,
  epfEmployee: number,
  monthNumber: number,
  ytdIncome: number,
  ytdPcb: number,
  maritalStatus: "single" | "married" = "single",
  numberOfChildren: number = 0
): number {
  // Calculate annual projection
  const remainingMonths = 12 - monthNumber + 1;
  const projectedAnnualIncome = ytdIncome + (grossMonthlySalary * remainingMonths);
  
  // Annual EPF deduction (up to RM 4,000 relief limit for tax)
  const annualEpfDeduction = epfEmployee * 12;
  const epfRelief = Math.min(annualEpfDeduction, 4000); // RM 4,000 cap for tax relief
  
  // Personal relief (automatic RM 9,000 for individuals)
  const personalRelief = 9000;
  
  // Spouse relief (if married and spouse has no income)
  const spouseRelief = maritalStatus === "married" ? 4000 : 0;
  
  // Child relief (RM 2,000 per child under 18)
  const childRelief = numberOfChildren * 2000;
  
  // Total reliefs
  const totalReliefs = personalRelief + epfRelief + spouseRelief + childRelief;
  
  // Chargeable income
  const chargeableIncome = Math.max(0, projectedAnnualIncome - totalReliefs);
  
  // Calculate annual tax
  const annualTax = calculateAnnualTax(chargeableIncome);
  
  // Monthly PCB = (Annual Tax - YTD PCB) / Remaining Months
  const pcbForRemainingMonths = Math.max(0, annualTax - ytdPcb);
  const monthlyPcb = Math.round((pcbForRemainingMonths / remainingMonths) * 100) / 100;
  
  return monthlyPcb;
}

// ============================================
// SEED DATA GENERATION
// ============================================

interface MonthlyPayslip {
  year: number;
  month: number;
  grossSalary: number;
  bonus: number;
  allowances: number;
  commission: number;
  totalIncome: number;
  epfEmployee: number;
  socso: number;
  eis: number;
  pcbAmount: number;
  ytdIncome: number;
  ytdPcb: number;
  ytdEpf: number;
}

function generateMonthlyPayslips(
  baseSalary: number,
  year: number,
  bonusMonth: number = 12, // December bonus
  bonusMultiplier: number = 1 // 1 month bonus
): MonthlyPayslip[] {
  const payslips: MonthlyPayslip[] = [];
  
  let ytdIncome = 0;
  let ytdPcb = 0;
  let ytdEpf = 0;
  
  for (let month = 1; month <= 12; month++) {
    const isBonus = month === bonusMonth;
    const bonus = isBonus ? baseSalary * bonusMultiplier : 0;
    
    // Add some realistic allowances
    const transportAllowance = 500;
    const mealAllowance = 300;
    const allowances = transportAllowance + mealAllowance;
    
    // No commission for this profile
    const commission = 0;
    
    const totalIncome = baseSalary + bonus + allowances + commission;
    
    // Calculate deductions
    const epf = calculateEPF(totalIncome);
    const socso = calculateSOCSO(totalIncome);
    const eis = calculateEIS(totalIncome);
    
    // Update YTD values
    ytdIncome += totalIncome;
    ytdEpf += epf.employee;
    
    // Calculate PCB
    const pcb = calculatePCB(
      totalIncome,
      epf.employee,
      month,
      ytdIncome - totalIncome, // YTD before this month
      ytdPcb, // YTD PCB before this month
      "single", // marital status
      0 // no children
    );
    
    ytdPcb += pcb;
    
    payslips.push({
      year,
      month,
      grossSalary: baseSalary,
      bonus,
      allowances,
      commission,
      totalIncome,
      epfEmployee: epf.employee,
      socso: socso.employee,
      eis: eis.employee,
      pcbAmount: pcb,
      ytdIncome,
      ytdPcb,
      ytdEpf,
    });
  }
  
  return payslips;
}

async function seedPcbData() {
  console.log("🇲🇾 Starting PCB seed for yuurimikasa@gmail.com...\n");
  
  // Find the user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, "yuurimikasa@gmail.com"))
    .limit(1);
  
  if (!user) {
    console.error("❌ User yuurimikasa@gmail.com not found!");
    process.exit(1);
  }
  
  console.log(`✅ Found user: ${user.name} (${user.email})`);
  console.log(`💰 Monthly Salary: RM ${user.salary}\n`);
  
  const baseSalary = parseFloat(user.salary || "35000");
  
  // Generate payslips for 2024 and 2025
  const years = [2024, 2025];
  
  for (const year of years) {
    console.log(`\n📅 Generating PCB records for ${year}...`);
    
    // Create tax year record first
    const [taxYear] = await db
      .insert(taxYears)
      .values({
        userId: user.id,
        year,
        grossIncome: (baseSalary * 12 + baseSalary).toString(), // 13 months with bonus
        employmentIncome: (baseSalary * 12 + baseSalary).toString(),
        assessmentType: "separate",
        filingStatus: year === 2024 ? "filed" : "draft",
      })
      .onConflictDoNothing()
      .returning();
    
    // Generate monthly payslips
    const payslips = generateMonthlyPayslips(
      baseSalary,
      year,
      12, // December bonus
      1 // 1 month bonus
    );
    
    // Only insert records up to current date for 2025
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    for (const payslip of payslips) {
      // Skip future months for current year
      if (year === currentYear && payslip.month > currentMonth) {
        continue;
      }
      
      // Skip future years
      if (year > currentYear) {
        continue;
      }
      
      await db
        .insert(monthlyPcbRecords)
        .values({
          userId: user.id,
          taxYearId: taxYear?.id,
          year: payslip.year,
          month: payslip.month,
          grossSalary: payslip.grossSalary.toFixed(2),
          bonus: payslip.bonus.toFixed(2),
          allowances: payslip.allowances.toFixed(2),
          commission: payslip.commission.toFixed(2),
          totalIncome: payslip.totalIncome.toFixed(2),
          epfEmployee: payslip.epfEmployee.toFixed(2),
          socso: payslip.socso.toFixed(2),
          eis: payslip.eis.toFixed(2),
          pcbAmount: payslip.pcbAmount.toFixed(2),
          ytdIncome: payslip.ytdIncome.toFixed(2),
          ytdPcb: payslip.ytdPcb.toFixed(2),
          ytdEpf: payslip.ytdEpf.toFixed(2),
        })
        .onConflictDoNothing();
      
      console.log(`  ${year}-${String(payslip.month).padStart(2, "0")}: RM ${payslip.totalIncome.toLocaleString()} | EPF: RM ${payslip.epfEmployee.toLocaleString()} | SOCSO: RM ${payslip.socso} | EIS: RM ${payslip.eis} | PCB: RM ${payslip.pcbAmount.toLocaleString()}`);
    }
  }
  
  console.log("\n✅ PCB seed completed successfully!");
  
  // Summary
  const summary2024 = generateMonthlyPayslips(baseSalary, 2024, 12, 1);
  const total2024 = summary2024[summary2024.length - 1];
  
  console.log("\n📊 2024 Annual Summary:");
  console.log(`   Total Income: RM ${total2024.ytdIncome.toLocaleString()}`);
  console.log(`   Total EPF (Employee): RM ${total2024.ytdEpf.toLocaleString()}`);
  console.log(`   Total PCB Paid: RM ${total2024.ytdPcb.toLocaleString()}`);
  console.log(`   Monthly SOCSO: RM ${total2024.socso}`);
  console.log(`   Monthly EIS: RM ${total2024.eis}`);
}

// Run the seed
seedPcbData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding PCB data:", error);
    process.exit(1);
  });
