// LHDN Tax Relief Categories for Malaysia (YA 2024)
// Based on official LHDN guidelines and Budget 2024/2025

export const LHDN_RELIEF_CATEGORIES = [
  // ============================================
  // INDIVIDUAL & FAMILY RELIEFS
  // ============================================
  {
    code: "SELF_DEPENDENTS",
    name: "Individual & Dependent Relatives",
    nameMs: "Individu & Saudara Tanggungan",
    description: "Automatic relief for individual taxpayer and dependent relatives",
    maxAmount: 9000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: false,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 1,
  },
  {
    code: "SPOUSE",
    name: "Husband/Wife/Alimony",
    nameMs: "Suami/Isteri/Nafkah",
    description: "Relief for spouse with no income or electing joint assessment. Also applies to alimony payments to ex-spouse.",
    maxAmount: 4000,
    reliefType: "relief",
    applicableTo: "spouse",
    requiresReceipt: false,
    requiresVerification: false,
    conditions: { maritalStatus: ["married", "divorced"] },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 2,
  },
  {
    code: "DISABLED_SELF",
    name: "Disabled Individual",
    nameMs: "Individu Kurang Upaya",
    description: "Additional relief for disabled individual certified by Department of Social Welfare",
    maxAmount: 6000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: false,
    requiresVerification: true,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 3,
  },
  {
    code: "DISABLED_SPOUSE",
    name: "Disabled Husband/Wife",
    nameMs: "Suami/Isteri Kurang Upaya",
    description: "Relief for having a disabled spouse",
    maxAmount: 5000,
    reliefType: "relief",
    applicableTo: "spouse",
    requiresReceipt: false,
    requiresVerification: true,
    conditions: { hasDisabledDependent: true },
    validFromYear: 2021,
    validUntilYear: null,
    sortOrder: 4,
  },

  // ============================================
  // CHILDREN RELIEFS
  // ============================================
  {
    code: "CHILD_UNDER_18",
    name: "Child Relief (Under 18)",
    nameMs: "Anak di bawah 18 tahun",
    description: "Relief for each unmarried child under 18 years old",
    maxAmount: 2000,
    reliefType: "relief",
    applicableTo: "child",
    requiresReceipt: false,
    requiresVerification: false,
    conditions: { hasChildren: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 10,
  },
  {
    code: "CHILD_HIGHER_ED",
    name: "Child (18+) in Full-Time Education",
    nameMs: "Anak 18+ dalam Pendidikan Penuh Masa",
    description: "Relief for unmarried child aged 18+ pursuing full-time diploma/degree in Malaysia or equivalent abroad",
    maxAmount: 8000,
    reliefType: "relief",
    applicableTo: "child",
    requiresReceipt: true,
    requiresVerification: false,
    conditions: { hasChildren: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 11,
  },
  {
    code: "DISABLED_CHILD",
    name: "Disabled Child",
    nameMs: "Anak Kurang Upaya",
    description: "Relief for disabled child of any age who is unmarried",
    maxAmount: 6000,
    reliefType: "relief",
    applicableTo: "child",
    requiresReceipt: false,
    requiresVerification: true,
    conditions: { hasDisabledDependent: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 12,
  },
  {
    code: "DISABLED_CHILD_HIGHER_ED",
    name: "Additional Relief - Disabled Child (18+) in Higher Education",
    nameMs: "Pelepasan Tambahan - Anak Kurang Upaya 18+ dalam Pendidikan Tinggi",
    description: "Additional relief for disabled child 18+ in full-time higher education",
    maxAmount: 8000,
    reliefType: "relief",
    applicableTo: "child",
    requiresReceipt: true,
    requiresVerification: true,
    conditions: { hasDisabledDependent: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 13,
  },
  {
    code: "CHILDCARE",
    name: "Childcare Fees",
    nameMs: "Yuran Taska/Tadika",
    description: "Fees paid for childcare centre or kindergarten for child aged 6 and below",
    maxAmount: 3000,
    reliefType: "relief",
    applicableTo: "child",
    requiresReceipt: true,
    requiresVerification: false,
    conditions: { hasChildren: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 14,
  },
  {
    code: "BREASTFEEDING",
    name: "Breastfeeding Equipment",
    nameMs: "Peralatan Penyusuan",
    description: "Purchase of breastfeeding equipment for child aged 2 and below. Claimable once every 2 years.",
    maxAmount: 1000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    conditions: { hasChildren: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 15,
  },

  // ============================================
  // EDUCATION RELIEFS
  // ============================================
  {
    code: "EDUCATION_SELF",
    name: "Education Fees (Self)",
    nameMs: "Yuran Pendidikan (Sendiri)",
    description: "Fees for courses at recognized institutions in Malaysia - diploma, degree, masters, doctorate, professional/technical qualifications",
    maxAmount: 7000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: 2024,
    sortOrder: 20,
  },
  {
    code: "SSPN",
    name: "SSPN (National Education Savings)",
    nameMs: "SSPN (Skim Simpanan Pendidikan Nasional)",
    description: "Net deposits in National Education Savings Scheme for children's higher education",
    maxAmount: 8000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    conditions: { hasChildren: true },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 21,
  },

  // ============================================
  // MEDICAL & HEALTH RELIEFS
  // ============================================
  {
    code: "MEDICAL_EXPENSES",
    name: "Medical Expenses (Self, Spouse, Child)",
    nameMs: "Perbelanjaan Perubatan (Sendiri, Pasangan, Anak)",
    description: "Medical treatment including serious diseases, fertility treatment, vaccination, COVID-19 tests, mental health examination",
    maxAmount: 10000,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2025,
    validUntilYear: null,
    sortOrder: 30,
  },
  {
    code: "MEDICAL_EXPENSES_2024",
    name: "Medical Expenses (Self, Spouse, Child) - YA 2024",
    nameMs: "Perbelanjaan Perubatan - TA 2024",
    description: "Medical treatment for YA 2024 including COVID-19 tests, mental health examination",
    maxAmount: 8000,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2024,
    validUntilYear: 2024,
    sortOrder: 31,
  },
  {
    code: "MEDICAL_PARENTS",
    name: "Medical Treatment for Parents",
    nameMs: "Rawatan Perubatan untuk Ibu Bapa",
    description: "Medical treatment, special needs, nursing home, and carer expenses for parents",
    maxAmount: 10000,
    reliefType: "relief",
    applicableTo: "parent",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2025,
    validUntilYear: null,
    sortOrder: 32,
  },
  {
    code: "MEDICAL_PARENTS_2024",
    name: "Medical Treatment for Parents - YA 2024",
    nameMs: "Rawatan Perubatan untuk Ibu Bapa - TA 2024",
    description: "Medical treatment, special needs, nursing home, and carer expenses for parents",
    maxAmount: 8000,
    reliefType: "relief",
    applicableTo: "parent",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: 2024,
    sortOrder: 33,
  },
  {
    code: "DISABLED_EQUIPMENT",
    name: "Disabled Supporting Equipment",
    nameMs: "Peralatan Sokongan Kurang Upaya",
    description: "Basic supporting equipment for disabled self, spouse, child, or parent (wheelchairs, hearing aids, etc.)",
    maxAmount: 6000,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: true,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 34,
  },

  // ============================================
  // INSURANCE & RETIREMENT RELIEFS
  // ============================================
  {
    code: "EPF_LIFE_INSURANCE",
    name: "EPF & Life Insurance",
    nameMs: "KWSP & Insurans Hayat",
    description: "EPF contributions (max RM4,000) and life insurance premiums/takaful (max RM3,000). Total max RM7,000.",
    maxAmount: 7000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 40,
  },
  {
    code: "PRS_ANNUITY",
    name: "Private Retirement Scheme (PRS) & Deferred Annuity",
    nameMs: "Skim Persaraan Swasta (PRS) & Anuiti Tertunda",
    description: "Contributions to approved private retirement schemes",
    maxAmount: 3000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2012,
    validUntilYear: 2025,
    sortOrder: 41,
  },
  {
    code: "EDUCATION_MEDICAL_INSURANCE",
    name: "Education & Medical Insurance",
    nameMs: "Insurans Pendidikan & Perubatan",
    description: "Insurance premiums for education or medical benefits for self, spouse, or child",
    maxAmount: 3000,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 42,
  },
  {
    code: "SOCSO",
    name: "SOCSO Contributions",
    nameMs: "Caruman PERKESO",
    description: "Contributions to Social Security Organisation (SOCSO) including EIS",
    maxAmount: 350,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2022,
    validUntilYear: null,
    sortOrder: 43,
  },

  // ============================================
  // LIFESTYLE RELIEFS
  // ============================================
  {
    code: "LIFESTYLE",
    name: "Lifestyle Expenses",
    nameMs: "Gaya Hidup",
    description: "Books, computers, smartphones, tablets, sports equipment, gym membership, internet subscription",
    maxAmount: 2500,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 50,
  },
  {
    code: "SPORTS_ADDITIONAL",
    name: "Additional Sports Relief",
    nameMs: "Pelepasan Tambahan Sukan",
    description: "Additional relief for sports equipment, facility rental, and competition registration fees",
    maxAmount: 500,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 51,
  },
  {
    code: "ELECTRONICS_SPECIAL",
    name: "Personal Computers/Smartphones/Tablets (Special)",
    nameMs: "Komputer/Telefon Pintar/Tablet (Khas)",
    description: "Additional lifestyle relief for purchase of personal computers, smartphones, or tablets",
    maxAmount: 2500,
    reliefType: "relief",
    applicableTo: "all",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: 2024,
    sortOrder: 52,
  },
  {
    code: "EV_CHARGING",
    name: "Electric Vehicle Charging Facilities",
    nameMs: "Kemudahan Pengecasan Kenderaan Elektrik",
    description: "Installation, purchase, hire purchase, rental, or subscription for EV charging facilities",
    maxAmount: 2500,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2022,
    validUntilYear: null,
    sortOrder: 53,
  },
  {
    code: "DOMESTIC_TRAVEL",
    name: "Domestic Travel (Special)",
    nameMs: "Pelancongan Domestik (Khas)",
    description: "Tourist accommodation, attractions, or tour packages within Malaysia",
    maxAmount: 1000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: 2024,
    sortOrder: 54,
  },
  {
    code: "HOUSING_LOAN_INTEREST",
    name: "Housing Loan Interest",
    nameMs: "Faedah Pinjaman Perumahan",
    description: "Interest paid on housing loan for first residential property (conditions apply)",
    maxAmount: 10000,
    reliefType: "relief",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    conditions: { otherConditions: ["First residential property", "SPA signed 2021-2023", "Must be completed within 3 years"] },
    validFromYear: 2021,
    validUntilYear: 2025,
    sortOrder: 55,
  },

  // ============================================
  // TAX DEDUCTIONS (Reduce Aggregate Income)
  // ============================================
  {
    code: "DONATIONS_APPROVED",
    name: "Donations to Approved Institutions",
    nameMs: "Sumbangan kepada Institusi yang Diluluskan",
    description: "Donations to approved charities, sports activities, and funds (limited to 10% of aggregate income)",
    maxAmount: null, // 10% of aggregate income
    reliefType: "deduction",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 60,
  },
  {
    code: "DONATIONS_OTHER",
    name: "Other Donations & Gifts",
    nameMs: "Sumbangan & Hadiah Lain",
    description: "Gifts of artefacts, manuscripts, paintings, donations to libraries, medical equipment to healthcare facilities",
    maxAmount: 20000,
    reliefType: "deduction",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 61,
  },
  {
    code: "PROFESSIONAL_MEMBERSHIP",
    name: "Professional Body Membership",
    nameMs: "Keahlian Badan Profesional",
    description: "Membership subscription fees paid to professional bodies for one's profession",
    maxAmount: null, // Full amount
    reliefType: "deduction",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 62,
  },

  // ============================================
  // TAX REBATES (Reduce Tax Payable)
  // ============================================
  {
    code: "REBATE_SELF",
    name: "Tax Rebate (Self)",
    nameMs: "Rebat Cukai (Sendiri)",
    description: "RM400 rebate if chargeable income does not exceed RM35,000",
    maxAmount: 400,
    reliefType: "rebate",
    applicableTo: "individual",
    requiresReceipt: false,
    requiresVerification: false,
    conditions: { incomeThreshold: 35000 },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 70,
  },
  {
    code: "REBATE_SPOUSE",
    name: "Tax Rebate (Spouse)",
    nameMs: "Rebat Cukai (Pasangan)",
    description: "RM400 rebate if chargeable income ≤ RM35,000 and spouse relief of RM4,000 is claimed",
    maxAmount: 400,
    reliefType: "rebate",
    applicableTo: "spouse",
    requiresReceipt: false,
    requiresVerification: false,
    conditions: { incomeThreshold: 35000, maritalStatus: ["married"] },
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 71,
  },
  {
    code: "ZAKAT",
    name: "Zakat/Fitrah",
    nameMs: "Zakat/Fitrah",
    description: "Payment of obligatory zakat and fitrah during the assessment year",
    maxAmount: null, // Full amount
    reliefType: "rebate",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: false,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 72,
  },
  {
    code: "DEPARTURE_LEVY_UMRAH",
    name: "Departure Levy Rebate (Umrah/Religious Travel)",
    nameMs: "Rebat Levi Berlepas (Umrah/Ibadat)",
    description: "Rebate for departure levy paid for umrah or other religious pilgrimages (not hajj). Claimable twice per lifetime.",
    maxAmount: null,
    reliefType: "rebate",
    applicableTo: "individual",
    requiresReceipt: true,
    requiresVerification: true,
    validFromYear: 2020,
    validUntilYear: null,
    sortOrder: 73,
  },
];

// Malaysia Progressive Tax Brackets (YA 2024)
export const MALAYSIA_TAX_BRACKETS = [
  { min: 0, max: 5000, rate: 0, cumulative: 0 },
  { min: 5001, max: 20000, rate: 1, cumulative: 0 },
  { min: 20001, max: 35000, rate: 3, cumulative: 150 },
  { min: 35001, max: 50000, rate: 6, cumulative: 600 },
  { min: 50001, max: 70000, rate: 11, cumulative: 1500 },
  { min: 70001, max: 100000, rate: 19, cumulative: 3700 },
  { min: 100001, max: 400000, rate: 25, cumulative: 9400 },
  { min: 400001, max: 600000, rate: 26, cumulative: 84400 },
  { min: 600001, max: 2000000, rate: 28, cumulative: 136400 },
  { min: 2000001, max: Infinity, rate: 30, cumulative: 528400 },
];

// Calculate Malaysian Income Tax
export function calculateMalaysianTax(chargeableIncome: number): {
  taxPayable: number;
  effectiveRate: number;
  breakdown: { bracket: string; taxableAmount: number; rate: number; tax: number }[];
} {
  if (chargeableIncome <= 0) {
    return { taxPayable: 0, effectiveRate: 0, breakdown: [] };
  }

  let taxPayable = 0;
  let remaining = chargeableIncome;
  const breakdown: { bracket: string; taxableAmount: number; rate: number; tax: number }[] = [];

  for (const bracket of MALAYSIA_TAX_BRACKETS) {
    if (remaining <= 0) break;

    const bracketMin = bracket.min;
    const bracketMax = bracket.max;
    const bracketRange = bracketMax - bracketMin + 1;
    
    if (chargeableIncome > bracketMin) {
      const taxableInBracket = Math.min(remaining, bracketRange);
      const taxInBracket = (taxableInBracket * bracket.rate) / 100;
      
      if (taxableInBracket > 0) {
        breakdown.push({
          bracket: `RM ${bracketMin.toLocaleString()} - RM ${bracketMax === Infinity ? "∞" : bracketMax.toLocaleString()}`,
          taxableAmount: taxableInBracket,
          rate: bracket.rate,
          tax: taxInBracket,
        });
        
        taxPayable += taxInBracket;
        remaining -= taxableInBracket;
      }
    }
  }

  const effectiveRate = chargeableIncome > 0 ? (taxPayable / chargeableIncome) * 100 : 0;

  return { taxPayable, effectiveRate, breakdown };
}

// Category lookup by code
export function getReliefCategoryByCode(code: string) {
  return LHDN_RELIEF_CATEGORIES.find(cat => cat.code === code);
}

// Get all relief categories by type
export function getReliefCategoriesByType(type: "relief" | "deduction" | "rebate") {
  return LHDN_RELIEF_CATEGORIES.filter(cat => cat.reliefType === type);
}

// Get active categories for a specific year
export function getActiveCategoriesForYear(year: number) {
  return LHDN_RELIEF_CATEGORIES.filter(cat => {
    const validFrom = cat.validFromYear || 0;
    const validUntil = cat.validUntilYear || Infinity;
    return year >= validFrom && year <= validUntil;
  });
}
