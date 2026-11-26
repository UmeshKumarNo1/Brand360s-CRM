export type ServicePricingMode = "govt_fee_included" | "govt_fee_added";

export interface ServicePricingInput {
  enteredServiceFee: number;
  govtFee: number;
  additionalFee?: number;
  pricingMode?: ServicePricingMode;
  approvedDiscountPct?: number;
  gstRate?: number;
  govtFeeGstExempt?: boolean;
}

export interface ServicePricingBreakdown {
  pricingMode: ServicePricingMode;
  enteredServiceFee: number;
  govtFee: number;
  additionalFee: number;
  netProfessionalFee: number;
  approvedDiscountPct: number;
  discountAmount: number;
  discountedProfessionalFee: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalServiceValue: number;
  isGovtFeeExceedingServiceFee: boolean;
}

/**
 * Computes standardized service pricing for both:
 * - 'govt_fee_included': Government fee is deducted from enteredServiceFee.
 * - 'govt_fee_added': Government fee is added on top of enteredServiceFee.
 * Approved discounts apply only to the professional fee (never to government fee).
 */
export function calculateServicePricing(input: ServicePricingInput): ServicePricingBreakdown {
  const pricingMode: ServicePricingMode = input.pricingMode || "govt_fee_added";
  const enteredServiceFee = Math.max(0, Number(input.enteredServiceFee) || 0);
  const govtFee = Math.max(0, Number(input.govtFee) || 0);
  const additionalFee = Math.max(0, Number(input.additionalFee) || 0);
  const approvedDiscountPct = Math.max(0, Math.min(100, Number(input.approvedDiscountPct) || 0));
  const gstRate = Math.max(0, Number(input.gstRate ?? 18));
  const govtFeeGstExempt = input.govtFeeGstExempt !== false;

  const isGovtFeeExceedingServiceFee =
    pricingMode === "govt_fee_included" && govtFee > enteredServiceFee;

  const netProfessionalFee =
    pricingMode === "govt_fee_included"
      ? Math.max(0, Math.round((enteredServiceFee - govtFee) * 100) / 100)
      : enteredServiceFee;

  const discountAmount =
    Math.round(netProfessionalFee * (approvedDiscountPct / 100) * 100) / 100;

  const discountedProfessionalFee = Math.max(
    0,
    Math.round((netProfessionalFee - discountAmount) * 100) / 100
  );

  const taxableBase = discountedProfessionalFee + additionalFee;
  const taxableAmount = govtFeeGstExempt
    ? taxableBase
    : Math.round((taxableBase + govtFee) * 100) / 100;

  const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const totalServiceValue = Math.round(
    (discountedProfessionalFee + additionalFee + govtFee + gstAmount) * 100
  ) / 100;

  return {
    pricingMode,
    enteredServiceFee,
    govtFee,
    additionalFee,
    netProfessionalFee,
    approvedDiscountPct,
    discountAmount,
    discountedProfessionalFee,
    taxableAmount,
    gstRate,
    gstAmount,
    totalServiceValue,
    isGovtFeeExceedingServiceFee,
  };
}

