"use server";

import { createClient } from "@/lib/supabase/server";

export interface OverbillingValidationResult {
  isOverbilling: boolean;
  contractValue: number;
  existingInvoicedAmount: number;
  proposedInvoiceAmount: number;
  totalWithProposed: number;
  excessAmount: number;
  canProceed: boolean;
  warningMessage?: string;
}

/**
 * Pre-validation check before creating an invoice.
 * Checks if (Existing Valid Issued Invoices + Proposed Invoice Amount) > Approved Contract Value.
 */
export async function checkInvoiceOverbillingAction(params: {
  clientId: string;
  proposedInvoiceAmount: number;
}): Promise<OverbillingValidationResult> {
  const { clientId, proposedInvoiceAmount } = params;

  const defaultResult: OverbillingValidationResult = {
    isOverbilling: false,
    contractValue: 0,
    existingInvoicedAmount: 0,
    proposedInvoiceAmount: proposedInvoiceAmount || 0,
    totalWithProposed: proposedInvoiceAmount || 0,
    excessAmount: 0,
    canProceed: true,
  };

  if (!clientId || proposedInvoiceAmount <= 0) {
    return defaultResult;
  }

  try {
    const supabase = await createClient();

    // 1. Fetch Client and active services
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
        .select("id, total_amount, status")
        .eq("client_id", clientId)
        .not("status", "in", '("Draft","Void","Cancelled")'),
    ]);

    const client = clientRes.data;
    const services = servicesRes.data || [];
    const invoices = invoicesRes.data || [];

    // Contract value calculation (either explicit client contract_value or sum of active services)
    const activeServices = services.filter((s: any) => (s.service_status || s.status) !== "Cancelled");
    const serviceContractSum = activeServices.reduce((sum: number, s: any) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
      return sum + amt;
    }, 0);

    const clientStoredContract = Number(client?.contract_value) || 0;
    const contractValue = Math.max(clientStoredContract, serviceContractSum);

    // Existing valid issued invoices
    const existingInvoicedAmount = invoices.reduce(
      (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
      0
    );

    const totalWithProposed = existingInvoicedAmount + proposedInvoiceAmount;
    const excessAmount = Math.max(0, totalWithProposed - contractValue);
    const isOverbilling = contractValue > 0 && excessAmount > 0.01;

    let warningMessage = undefined;
    if (isOverbilling) {
      warningMessage = `Proposed invoice of ₹${proposedInvoiceAmount.toLocaleString("en-IN")} brings total invoiced to ₹${totalWithProposed.toLocaleString("en-IN")}, exceeding the agreed contract value of ₹${contractValue.toLocaleString("en-IN")} by ₹${excessAmount.toLocaleString("en-IN")}. Administrator authorization with documented reason is required to proceed.`;
    }

    return {
      isOverbilling,
      contractValue,
      existingInvoicedAmount,
      proposedInvoiceAmount,
      totalWithProposed,
      excessAmount,
      canProceed: !isOverbilling,
      warningMessage,
    };
  } catch (err: any) {
    console.error("checkInvoiceOverbillingAction error:", err);
    return defaultResult;
  }
}

