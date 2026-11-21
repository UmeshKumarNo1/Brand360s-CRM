import { createClient } from "@/lib/supabase/server";
import { calculateClientFinancials } from "@/lib/financial/financial-calculator";

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
 * 2. Total Invoiced = Sum of valid issued invoice totals (status NOT IN ('Draft', 'Void', 'Cancelled'))
 * 3. Total Received = Sum of verified client payments
 * 4. Total Allocated = Sum of valid allocations to issued invoices
 * 5. Unallocated Payment = Math.max(0, Total Received - Total Allocated)
 * 6. Invoice Outstanding = Sum of unpaid balance_due on issued valid invoices
 * 7. Contract Yet to Invoice = Math.max(0, Contract Value - Total Invoiced)
 * 8. Contract Receivable = Math.max(0, Contract Value - Total Received)
 */
export async function fetchClientFinancialSummaryAction(
  clientId: string
): Promise<ClientComprehensiveFinancialSummary> {
  const supabase = await createClient();

  // 1. Fetch active client services
  const { data: services } = await supabase
    .from("client_services")
    .select("id, total_amount, service_fee, govt_fee, additional_fee, discount, service_status")
    .eq("client_id", clientId);

  // 2. Fetch invoices (excluding Draft, Void, Cancelled)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total_amount, amount_paid, balance_due, status")
    .eq("client_id", clientId)
    .not("status", "in", '("Draft","Void","Cancelled")');

  // 3. Fetch verified non-reversed payments
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status")
    .eq("client_id", clientId);

  const confirmedPayments = (payments || []).filter(
    (p: any) =>
      ["Verified", "Completed", "Received"].includes(p.status) ||
      (!["Pending", "Failed", "Cancelled", "Reversed"].includes(p.status) && p.status !== undefined)
  );

  // 4. Fetch allocations for client's invoices
  const invoiceIds = (invoices || []).map((i: any) => i.id);
  let allocations: any[] = [];
  if (invoiceIds.length > 0) {
    const { data: allocs } = await supabase
      .from("invoice_payment_allocations")
      .select("id, invoice_id, payment_id, allocated_amount, client_service_id")
      .in("invoice_id", invoiceIds);
    allocations = allocs || [];
  }

  // Use Central Financial Calculator
  const clientMetrics = calculateClientFinancials({
    clientId,
    services: services || [],
    invoices: invoices || [],
    payments: confirmedPayments,
    allocations,
  });

  const contractYetToInvoice = Math.max(0, clientMetrics.contractValue - clientMetrics.invoicedAmount);
  const contractReceivable = clientMetrics.contractBalance;

  return {
    clientId,
    contractValue: clientMetrics.contractValue,
    totalInvoiced: clientMetrics.invoicedAmount,
    totalReceived: clientMetrics.collectedAmount,
    totalAllocated: clientMetrics.allocatedAmount,
    unallocatedPayment: clientMetrics.unallocatedAdvance,
    invoiceOutstanding: clientMetrics.invoiceOutstanding,
    contractYetToInvoice,
    contractReceivable,
  };
}
