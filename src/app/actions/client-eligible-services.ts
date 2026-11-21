"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchClientDetailedServicesAction, DetailedServiceData } from "./client-detailed-services";

export interface EligibleServiceForInvoice {
  id: string;
  clientId: string;
  serviceName: string;
  serviceCategory: string;
  contractValue: number;
  serviceFee: number;
  govtFee: number;
  taxRate: number;
  invoicedAmount: number;
  remainingBillableAmount: number;
  paymentStatus: "Not Invoiced" | "Partially Paid" | "Paid" | "Unpaid" | "Overdue";
  isFullyInvoiced: boolean;
  serviceStatus: string;
}

/**
 * Fetches all services belonging to a client that are eligible for invoicing.
 * A service is eligible if:
 * 1. It is not cancelled or archived.
 * 2. It is not fully invoiced (invoicedAmount < contractValue - 0.01).
 * Returns both eligible and non-eligible services with eligibility flags so the UI
 * can render the dropdown cleanly.
 */
export async function fetchClientEligibleServicesForInvoiceAction(
  clientId: string
): Promise<EligibleServiceForInvoice[]> {
  if (!clientId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const detailedServices = await fetchClientDetailedServicesAction(clientId);
    if (!detailedServices || detailedServices.length === 0) {
      return [];
    }

    return detailedServices
      .filter((s) => s.serviceStatus !== "Cancelled" && s.serviceStatus !== "Archived")
      .map((s) => {
        const contractVal = Number(s.contractValue) || 0;
        const invoicedVal = Number(s.invoicedAmount) || 0;
        // Remaining billable subtotal on the contract
        const remainingBillable = Math.max(0, contractVal - invoicedVal);
        const isFullyInvoiced = invoicedVal >= contractVal - 0.01 && invoicedVal > 0;

        return {
          id: s.id,
          clientId: s.clientId,
          serviceName: s.serviceName,
          serviceCategory: s.serviceCategory || "General",
          contractValue: contractVal,
          serviceFee: Number(s.serviceFee) || 0,
          govtFee: Number(s.govtFee) || 0,
          taxRate: s.taxRate !== undefined && s.taxRate !== null ? Number(s.taxRate) : 18,
          invoicedAmount: invoicedVal,
          remainingBillableAmount: remainingBillable,
          paymentStatus: s.paymentStatus,
          isFullyInvoiced,
          serviceStatus: s.serviceStatus,
        };
      });
  } catch (err) {
    console.error("Error in fetchClientEligibleServicesForInvoiceAction:", err);
    return [];
  }
}

