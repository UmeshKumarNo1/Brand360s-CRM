/**
 * Authoritative, shared GST and tax calculation engine for BRAND 360s CRM.
 * Implements standard Indian Goods and Services Tax (GST) principles:
 * - Taxable Value = Professional / Service fee + Additional taxable charges - Discounts.
 * - Eligible Pure-Agent Government Fees = Separately identified, non-taxable statutory reimbursements
 *   (e.g., MCA ROC filing fees, Trademark Govt fees, Official registry stamps) excluded from GST calculation.
 * - Intra-State (Home state e.g. Tamil Nadu) => CGST (Rate/2) + SGST (Rate/2).
 * - Inter-State => IGST (Full Rate).
 */

export interface GstCalculationInput {
  serviceFee: number;
  govtFee?: number;
  isEligiblePureAgent?: boolean;
  additionalCharges?: number;
  discount?: number;
  taxRate: number; // e.g. 18, 12, 5, 0
  clientState?: string | null;
  supplierState?: string | null; // Defaults to "Tamil Nadu" (code 33)
}

export interface GstCalculationResult {
  serviceFee: number;
  taxableAmount: number;
  govtFee: number;
  isEligiblePureAgent: boolean;
  taxRate: number;
  taxType: "CGST + SGST" | "IGST" | "No tax";
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  pureAgentReimbursement: number;
  invoiceTotal: number;
  contractValue: number; // Pure agreed commercial fee (serviceFee + govtFee) excluding GST
}

export function isIntraStateSupply(clientState?: string | null, supplierState: string = "Tamil Nadu"): boolean {
  if (!clientState) return true; // Default to intra-state if unstated
  const c = clientState.trim().toLowerCase();
  const s = supplierState.trim().toLowerCase();
  if (c.includes("tamil nadu") || c.includes("tn") || c === "33") return true;
  return c === s;
}

export function calculateGstBreakdown(input: GstCalculationInput): GstCalculationResult {
  const serviceFee = Math.max(0, Number(input.serviceFee) || 0);
  const additionalCharges = Math.max(0, Number(input.additionalCharges) || 0);
  const discount = Math.max(0, Number(input.discount) || 0);
  const govtFee = Math.max(0, Number(input.govtFee) || 0);
  const taxRate = Math.max(0, Number(input.taxRate) || 0);
  const isEligiblePureAgent = input.isEligiblePureAgent !== false; // Default true for statutory government filing reimbursements

  // Taxable subtotal (Service fee + other charges - discount)
  // If government fee is NOT eligible pure agent, it is added to taxable base
  const taxableAmount = Math.max(
    0,
    Math.round((serviceFee + additionalCharges - discount + (isEligiblePureAgent ? 0 : govtFee)) * 100) / 100
  );

  const pureAgentReimbursement = isEligiblePureAgent ? govtFee : 0;

  // Determine supply type
  const isIntra = isIntraStateSupply(input.clientState, input.supplierState);
  let taxType: "CGST + SGST" | "IGST" | "No tax" = "No tax";

  if (taxRate > 0 && taxableAmount > 0) {
    taxType = isIntra ? "CGST + SGST" : "IGST";
  }

  // Calculate GST
  const totalTaxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxType === "CGST + SGST") {
    cgstAmount = Math.round((totalTaxAmount / 2) * 100) / 100;
    sgstAmount = Math.round((totalTaxAmount - cgstAmount) * 100) / 100;
  } else if (taxType === "IGST") {
    igstAmount = totalTaxAmount;
  }

  // Invoice total = Taxable Amount + GST Amount + Pure-Agent Govt Fee
  const invoiceTotal = Math.round((taxableAmount + totalTaxAmount + pureAgentReimbursement) * 100) / 100;

  // Agreed Service Contract Value is pure commercial agreed deliverable (service fee + govt fee)
  const contractValue = serviceFee + govtFee;

  return {
    serviceFee,
    taxableAmount,
    govtFee,
    isEligiblePureAgent,
    taxRate,
    taxType,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount,
    pureAgentReimbursement,
    invoiceTotal,
    contractValue,
  };
}

