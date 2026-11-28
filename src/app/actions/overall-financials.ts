"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchAuthorizedClientsFinancialRecords } from "@/lib/financial/financial-data-fetcher";

export interface OverallFinancialSummary {
  totalContractValue: number;
  totalInvoiced: number;
  totalReceived: number;
  outstandingReceivable: number;
  totalVerifiedPayments: number;
  unallocatedPayments: number;
  invoiceCount: number;
  reconciles: boolean;
}

function roundINR(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Single Source of Truth for overall CRM financial KPI cards
 * (Clients page, Payments page, and Dashboard).
 * Always aggregates across ALL authorized clients & eligible invoices,
 * independent of table pagination, search, or UI filters.
 */
export async function fetchOverallFinancialSummaryAction(): Promise<OverallFinancialSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalContractValue: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      outstandingReceivable: 0,
      totalVerifiedPayments: 0,
      unallocatedPayments: 0,
      invoiceCount: 0,
      reconciles: true,
    };
  }

  // Fetch all authorized non-archived clients and their active services
  const { data: clients } = await supabase
    .from("clients")
    .select("id, client_status, contract_value, services:client_services(total_amount, service_fee, govt_fee, additional_fee, discount, service_status)")
    .neq("client_status", "Archived");

  const activeClients = clients || [];
  const allClientIds = activeClients.map((c: any) => c.id);

  const totalContractValue = roundINR(
    activeClients.reduce((sum: number, c: any) => {
      const activeSvcs = (c.services || []).filter(
        (s: any) => (s.service_status || s.status) !== "Cancelled"
      );
      if (activeSvcs.length > 0) {
        return (
          sum +
          activeSvcs.reduce((sSum: number, s: any) => {
            const amt =
              Number(s.total_amount) ||
              (Number(s.service_fee) || 0) +
                (Number(s.govt_fee) || 0) +
                (Number(s.additional_fee) || 0) -
                (Number(s.discount) || 0);
            return sSum + amt;
          }, 0)
        );
      }
      return sum + (Number(c.contract_value) || 0);
    }, 0)
  );

  const { invoices, payments, allocations } =
    await fetchAuthorizedClientsFinancialRecords(supabase, allClientIds);

  const validPaymentIds = new Set(
    (payments || [])
      .filter((p: any) =>
        ["Verified", "Completed", "Received", "Approved"].includes(p.status)
      )
      .map((p: any) => p.id)
  );

  const totalVerifiedPayments = roundINR(
    (payments || [])
      .filter((p: any) => validPaymentIds.has(p.id))
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
  );

  const allocationsByInvoice: Record<string, number> = {};
  (allocations || []).forEach((a: any) => {
    if (a.invoice_id && (!a.payment_id || validPaymentIds.has(a.payment_id))) {
      allocationsByInvoice[a.invoice_id] = roundINR(
        (allocationsByInvoice[a.invoice_id] || 0) + (Number(a.allocated_amount) || 0)
      );
    }
  });

  let totalInvoiced = 0;
  let totalReceived = 0;
  let outstandingReceivable = 0;

  (invoices || []).forEach((inv: any) => {
    const invTotal = roundINR(Number(inv.total_amount) || 0);
    const invAllocated = Math.min(invTotal, allocationsByInvoice[inv.id] || 0);
    const invOutstanding = roundINR(Math.max(0, invTotal - invAllocated));

    totalInvoiced = roundINR(totalInvoiced + invTotal);
    totalReceived = roundINR(totalReceived + invAllocated);
    outstandingReceivable = roundINR(outstandingReceivable + invOutstanding);
  });

  const unallocatedPayments = roundINR(Math.max(0, totalVerifiedPayments - totalReceived));
  const reconciles = Math.abs(totalInvoiced - (totalReceived + outstandingReceivable)) < 0.01;

  return {
    totalContractValue,
    totalInvoiced,
    totalReceived,
    outstandingReceivable,
    totalVerifiedPayments,
    unallocatedPayments,
    invoiceCount: (invoices || []).length,
    reconciles,
  };
}

