import { createClient } from "@/lib/supabase/server";

export interface ClientComprehensiveFinancialSummary {
  clientId: string;
  contractValue: number;
  totalInvoiced: number;
  totalReceived: number;
  totalAllocated: number;
  unallocatedPayment: number;
  invoiceOutstanding: number;
  contractYetToInvoice: number;
  contractReceivable: number;
}

/**
 * Calculates authoritative financial breakdown for a client according to the Brand360s Financial Model:
 * 1. Contract Value = Sum of active service contract values (service_status <> 'Cancelled')
 * 2. Total Invoiced = Sum of valid issued invoice totals (status <> 'Cancelled')
 * 3. Total Received = Sum of verified, non-reversed client payments (status = 'Verified')
 * 4. Total Allocated = Sum of valid allocations to invoices
 * 5. Unallocated Payment = Total Received - Total Allocated
 * 6. Invoice Outstanding = Total Invoiced - Total Allocated (or sum of invoice balance_due)
 * 7. Contract Yet to Invoice = Math.max(0, Contract Value - Total Invoiced)
 * 8. Contract Receivable = Math.max(0, Contract Value - Total Received)
 */
export async function fetchClientFinancialSummaryAction(clientId: string): Promise<ClientComprehensiveFinancialSummary> {
  const supabase = await createClient();

  // 1. Active Services
  const { data: services } = await supabase
    .from("client_services")
    .select("total_amount, service_fee, govt_fee, service_status")
    .eq("client_id", clientId);

  const activeServices = (services || []).filter((s: any) => s.service_status !== "Cancelled");
  const contractValue = activeServices.reduce((sum: number, s: any) => {
    const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0));
    return sum + amt;
  }, 0);

  // 2. Invoices (non-cancelled)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total_amount, status")
    .eq("client_id", clientId)
    .neq("status", "Cancelled");

  const totalInvoiced = (invoices || []).reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);
  const invoiceIds = (invoices || []).map((i: any) => i.id);

  // 3. Verified Payments
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status")
    .eq("client_id", clientId)
    .eq("status", "Verified");

  const totalReceived = (payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const paymentIds = (payments || []).map((p: any) => p.id);

  // 4. Valid Allocations
  let totalAllocated = 0;
  if (invoiceIds.length > 0 && paymentIds.length > 0) {
    const { data: allocations } = await supabase
      .from("invoice_payment_allocations")
      .select("allocated_amount")
      .in("invoice_id", invoiceIds)
      .in("payment_id", paymentIds);

    totalAllocated = (allocations || []).reduce((sum: number, a: any) => sum + (Number(a.allocated_amount) || 0), 0);
  }

  // 5. Computed Separate Fields
  const unallocatedPayment = Math.max(0, totalReceived - totalAllocated);
  const invoiceOutstanding = Math.max(0, totalInvoiced - totalAllocated);
  const contractYetToInvoice = Math.max(0, contractValue - totalInvoiced);
  const contractReceivable = Math.max(0, contractValue - totalReceived);

  return {
    clientId,
    contractValue,
    totalInvoiced,
    totalReceived,
    totalAllocated,
    unallocatedPayment,
    invoiceOutstanding,
    contractYetToInvoice,
    contractReceivable,
  };
}

