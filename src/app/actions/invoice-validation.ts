"use server";

import { createClient } from "@/lib/supabase/server";

export interface OverbillingValidationResult {
  isOverbilling: boolean;
  contractValue: number; // Agreed contract value (Excl. GST)
  existingInvoicedAmount: number; // Total previously invoiced taxable value (Excl. GST)
  proposedInvoiceAmount: number; // Proposed taxable subtotal (Excl. GST)
  totalWithProposed: number; // Existing Invoiced + Proposed Subtotal (Excl. GST)
  remainingContractValue: number; // Contract Value - Existing Invoiced Amount (Excl. GST)
  excessAmount: number; // Math.max(0, Total With Proposed - Contract Value)
  canProceed: boolean;
  warningMessage?: string;
}

/**
 * Pre-validation check before creating an invoice.
 * BUSINESS RULE:
 * Contract Value represents agreed service value EXCLUDING GST.
 * Invoice Subtotal represents taxable service value EXCLUDING GST.
 * Checks if (Total Previously Invoiced Taxable Value + Proposed Taxable Subtotal) > Approved Contract Value.
 * GST is calculated separately and must NOT be counted as contract overbilling.
 */
export async function checkInvoiceOverbillingAction(params: {
  clientId: string;
  proposedInvoiceAmount: number; // Taxable subtotal (Excl. GST)
}): Promise<OverbillingValidationResult> {
  const { clientId, proposedInvoiceAmount } = params;

  const defaultResult: OverbillingValidationResult = {
    isOverbilling: false,
    contractValue: 0,
    existingInvoicedAmount: 0,
    proposedInvoiceAmount: proposedInvoiceAmount || 0,
    totalWithProposed: proposedInvoiceAmount || 0,
    remainingContractValue: 0,
    excessAmount: 0,
    canProceed: true,
  };

  if (!clientId || proposedInvoiceAmount <= 0) {
    return defaultResult;
  }

  try {
    const supabase = await createClient();

    // 1. Fetch Client, active services, and non-cancelled/non-void invoices
    const [clientRes, servicesRes, invoicesRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, company_name, contract_value")
        .eq("id", clientId)
        .single(),
      supabase
        .from("client_services")
        .select("id, total_amount, service_fee, govt_fee, additional_fee, discount, service_status")
        .eq("client_id", clientId),
      supabase
        .from("invoices")
        .select(`
          id,
          subtotal,
          tax_amount,
          total_amount,
          status,
          items:invoice_items (
            id,
            unit_price,
            quantity,
            discount_amount,
            total
          )
        `)
        .eq("client_id", clientId)
        .not("status", "in", '("Draft","Void","Cancelled")'),
    ]);

    const client = clientRes.data;
    const services = servicesRes.data || [];
    const invoices = invoicesRes.data || [];

    // Contract value calculation (either explicit client contract_value or sum of active services excl. GST)
    const activeServices = services.filter((s: any) => (s.service_status || s.status) !== "Cancelled");
    const serviceContractSum = activeServices.reduce((sum: number, s: any) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
      return sum + amt;
    }, 0);

    const clientStoredContract = Number(client?.contract_value) || 0;
    const contractValue = Math.max(clientStoredContract, serviceContractSum);

    // Existing valid issued invoices - Taxable Subtotal EXCLUDING GST
    // Prioritize inv.subtotal; if missing, calculate from invoice_items (unit_price * quantity - discount)
    // or fallback to total_amount - tax_amount
    const existingInvoicedAmount = invoices.reduce((sum: number, inv: any) => {
      let taxableSubtotal = 0;
      if (inv.subtotal !== null && inv.subtotal !== undefined && Number(inv.subtotal) > 0) {
        taxableSubtotal = Number(inv.subtotal);
      } else if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
        taxableSubtotal = inv.items.reduce((iSum: number, it: any) => {
          const itemSubtotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 1) - (Number(it.discount_amount) || 0);
          return iSum + (itemSubtotal > 0 ? itemSubtotal : Number(it.total) || 0);
        }, 0);
      } else {
        const total = Number(inv.total_amount) || 0;
        const tax = Number(inv.tax_amount) || 0;
        taxableSubtotal = Math.max(0, total - tax);
      }
      return sum + taxableSubtotal;
    }, 0);

    const remainingContractValue = Math.max(0, contractValue - existingInvoicedAmount);
    const totalWithProposed = existingInvoicedAmount + proposedInvoiceAmount;
    const excessAmount = Math.max(0, totalWithProposed - contractValue);
    const isOverbilling = contractValue > 0 && excessAmount > 0.01;

    let warningMessage = undefined;
    if (isOverbilling) {
      warningMessage = `Proposed taxable service value of ₹${proposedInvoiceAmount.toLocaleString("en-IN")} brings total invoiced to ₹${totalWithProposed.toLocaleString("en-IN")}, exceeding the agreed contract value of ₹${contractValue.toLocaleString("en-IN")} by ₹${excessAmount.toLocaleString("en-IN")}. Administrator authorization with documented reason is required to proceed.`;
    }

    return {
      isOverbilling,
      contractValue,
      existingInvoicedAmount,
      proposedInvoiceAmount,
      totalWithProposed,
      remainingContractValue,
      excessAmount,
      canProceed: !isOverbilling,
      warningMessage,
    };
  } catch (err: any) {
    console.error("checkInvoiceOverbillingAction error:", err);
    return defaultResult;
  }
}

