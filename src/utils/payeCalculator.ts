/**
 * Nigerian PAYE (Pay As You Earn) Tax Calculator
 * Implements the graduated tax bands and annualization method
 */

// Nigerian PAYE Tax Bands (Annual)
const TAX_BANDS = [
  { min: 0, max: 800000, rate: 0 },         // First ₦800,000 - No tax
  { min: 800001, max: 3000000, rate: 0.15 }, // ₦800,001 - ₦3,000,000 - 15%
  { min: 3000001, max: 12000000, rate: 0.18 }, // ₦3,000,001 - ₦12,000,000 - 18%
  { min: 12000001, max: 25000000, rate: 0.21 }, // ₦12,000,001 - ₦25,000,000 - 21%
  { min: 25000001, max: 50000000, rate: 0.23 }, // ₦25,000,001 - ₦50,000,000 - 23%
  { min: 50000001, max: Infinity, rate: 0.25 }, // Above ₦50,000,000 - 25%
];

/**
 * Calculate annual tax based on graduated tax bands
 * @param annualTaxableIncome - Total annual taxable income
 * @returns Annual tax amount
 */
export function calculateAnnualTax(annualTaxableIncome: number): number {
  if (annualTaxableIncome <= 0) return 0;
  
  let totalTax = 0;
  let remainingIncome = annualTaxableIncome;
  
  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;
    
    const bandStart = band.min === 0 ? 0 : band.min - 1;
    const bandSize = band.max === Infinity 
      ? remainingIncome 
      : Math.min(band.max - bandStart, remainingIncome);
    
    if (bandSize > 0) {
      totalTax += bandSize * band.rate;
      remainingIncome -= bandSize;
    }
  }
  
  return totalTax;
}

/**
 * Calculate monthly PAYE tax using annualization method
 * This method projects annual income based on YTD earnings and adjusts monthly tax accordingly
 * 
 * @param ytdTaxableIncome - Year-to-date taxable income BEFORE this month
 * @param currentMonthTaxableIncome - This month's taxable income
 * @param monthNumber - Current month (1-12)
 * @param ytdTaxPaid - Tax already paid year-to-date (before this month)
 * @returns Monthly PAYE tax for this month
 */
export function calculateMonthlyPAYE(
  ytdTaxableIncome: number,
  currentMonthTaxableIncome: number,
  monthNumber: number,
  ytdTaxPaid: number
): number {
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error('Month number must be between 1 and 12');
  }
  
  // Step 1: Calculate total YTD taxable income including this month
  const totalYtdIncome = ytdTaxableIncome + currentMonthTaxableIncome;
  
  // Step 2: Calculate average monthly income so far
  const averageMonthlyIncome = totalYtdIncome / monthNumber;
  
  // Step 3: Project annual income based on average
  const estimatedAnnualIncome = averageMonthlyIncome * 12;
  
  // Step 4: Calculate annual tax using graduated bands
  const estimatedAnnualTax = calculateAnnualTax(estimatedAnnualIncome);
  
  // Step 5: Calculate monthly tax portion
  const monthlyTaxPortion = estimatedAnnualTax / 12;
  
  // Step 6: Calculate cumulative tax due up to this month
  const cumulativeTaxDue = monthlyTaxPortion * monthNumber;
  
  // Step 7: Calculate this month's PAYE (cumulative due minus already paid)
  const thisMonthPaye = Math.max(0, cumulativeTaxDue - ytdTaxPaid);
  
  return thisMonthPaye;
}

/**
 * Get detailed PAYE calculation breakdown for display purposes
 */
export function getPAYEBreakdown(
  ytdTaxableIncome: number,
  currentMonthTaxableIncome: number,
  monthNumber: number,
  ytdTaxPaid: number
): {
  totalYtdIncome: number;
  averageMonthlyIncome: number;
  estimatedAnnualIncome: number;
  estimatedAnnualTax: number;
  monthlyTaxPortion: number;
  cumulativeTaxDue: number;
  thisMonthPaye: number;
  taxBandApplied: string;
} {
  const totalYtdIncome = ytdTaxableIncome + currentMonthTaxableIncome;
  const averageMonthlyIncome = totalYtdIncome / monthNumber;
  const estimatedAnnualIncome = averageMonthlyIncome * 12;
  const estimatedAnnualTax = calculateAnnualTax(estimatedAnnualIncome);
  const monthlyTaxPortion = estimatedAnnualTax / 12;
  const cumulativeTaxDue = monthlyTaxPortion * monthNumber;
  const thisMonthPaye = Math.max(0, cumulativeTaxDue - ytdTaxPaid);
  
  // Determine which tax band the annual income falls into
  let taxBandApplied = 'No Tax (under ₦800,000)';
  if (estimatedAnnualIncome > 50000000) {
    taxBandApplied = '25% (over ₦50M)';
  } else if (estimatedAnnualIncome > 25000000) {
    taxBandApplied = '23% (₦25M - ₦50M)';
  } else if (estimatedAnnualIncome > 12000000) {
    taxBandApplied = '21% (₦12M - ₦25M)';
  } else if (estimatedAnnualIncome > 3000000) {
    taxBandApplied = '18% (₦3M - ₦12M)';
  } else if (estimatedAnnualIncome > 800000) {
    taxBandApplied = '15% (₦800K - ₦3M)';
  }
  
  return {
    totalYtdIncome,
    averageMonthlyIncome,
    estimatedAnnualIncome,
    estimatedAnnualTax,
    monthlyTaxPortion,
    cumulativeTaxDue,
    thisMonthPaye,
    taxBandApplied,
  };
}

/**
 * Format currency in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
}
