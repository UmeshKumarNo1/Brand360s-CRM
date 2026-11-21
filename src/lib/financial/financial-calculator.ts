import { formatINR } from "@/lib/utils";

export interface ServiceFinancialMetrics {
  serviceId: string;
  contractValue: number;
  invoicedAmount: number;
  collectedAmount: number;
  outstandingAmount: number; // Invoiced - Collected for this service (or 0 if not invoiced)
  paymentProgress: number;   // Paid / Invoiced % (or 0% if Not Invoiced)
  paymentStatus: "Paid" | "Partially Paid" | "Partial" | "Unpaid" | "Not Invoiced";
  hasIssuedInvoice: boolean;
  hasCommercialMismatch: boolean; // true if contractValue !== invoicedAmount when issued invoices exist
}

export interface ClientFinancialMetrics {
  clientId: string;
  contractValue: number;      // Sum of active services' contract values
  invoicedAmount: number;     // Sum of issued valid invoices (excluding Draft, Void, Cancelled)
  collectedAmount: number;    // Sum of verified received payments
  allocatedAmount: number;    // Sum of payments allocated to invoices
  unallocatedAdvance: number; // Verified payments not yet allocated to invoices
  invoiceOutstanding: number; // Sum of unpaid balance_due on issued valid invoices
  contractBalance: number;    // Contract Value - Verified Collections
  paymentStatus: "Paid in full" | "Partially Paid" | "Upcoming" | "Overdue";
}

/**
 * Calculates standardized financial metrics for a single client service.
 * Follows the Brand360s CRM Financial Specification:
 * - Contract Value = Service total_amount (or service_fee + govt_fee + additional_fee - discount)
 * - Invoiced Amount = Sum of line items linked to this service on issued invoices
 * - Collected Amount = Sum of verified payment allocations for this service
 * - Outstanding Amount = Math.max(0, Invoiced Amount - Collected Amount)
 * - Payment Progress = Invoiced Amount > 0 ? (Collected Amount / Invoiced Amount) * 100 : 0
 */
export function calculateServiceFinancials(params: {
  service: any;
  serviceInvoices: any[];
  serviceAllocatedAmount: number;
}): ServiceFinancialMetrics {
  const { service, serviceInvoices, serviceAllocatedAmount } = params;

  // 1. Contract Value
  const contractValue =
    Number(service.total_amount) ||
    ((Number(service.service_fee) || 0) +
      (Number(service.govt_fee) || 0) +
      (Number(service.additional_fee) || 0) -
      (Number(service.discount) || 0));

  // 2. Invoiced Amount (only from issued/non-cancelled/non-draft invoices)
  const validIssuedInvoices = (serviceInvoices || []).filter(
    (inv: any) => !["Draft", "Void", "Cancelled"].includes(inv.status)
  );

  const invoicedAmount = validIssuedInvoices.reduce((sum: number, inv: any) => {
    // If invoice items specifically link to this service, sum those items
    if (inv.items && Array.isArray(inv.items)) {
      const serviceItems = inv.items.filter(
        (it: any) => it.client_service_id === service.id
      );
      if (serviceItems.length > 0) {
        return (
          sum +
          serviceItems.reduce(
            (iSum: number, it: any) => iSum + (Number(it.total) || 0),
            0
          )
        );
      }
    }
    // Fallback: If entire invoice was attributed to this service
    return sum + (Number(inv.totalAmount ?? inv.total_amount) || 0);
  }, 0);

  const hasIssuedInvoice = validIssuedInvoices.length > 0;

  // 3. Collected Amount
  const collectedAmount = Math.max(0, serviceAllocatedAmount || 0);

  // 4. Outstanding Amount = Invoiced - Collected
  const outstandingAmount = Math.max(0, invoicedAmount - collectedAmount);

  // 5. Payment Status & Progress
  let paymentProgress = 0;
  let paymentStatus: "Paid" | "Partially Paid" | "Partial" | "Unpaid" | "Not Invoiced" = "Not Invoiced";

  if (!hasIssuedInvoice || invoicedAmount === 0) {
    paymentStatus = "Not Invoiced";
    paymentProgress = 0;
  } else if (collectedAmount >= invoicedAmount - 0.009) {
    paymentStatus = "Paid";
    paymentProgress = 100;
  } else if (collectedAmount > 0.009) {
    paymentStatus = "Partially Paid";
    paymentProgress = Math.min(
      99,
      Math.max(1, Math.round((collectedAmount / invoicedAmount) * 100))
    );
  } else {
    paymentStatus = "Unpaid";
    paymentProgress = 0;
  }

  // 6. Commercial mismatch: contractValue differs from invoiced amount
  const hasCommercialMismatch =
    hasIssuedInvoice && Math.abs(contractValue - invoicedAmount) > 0.01;

  return {
    serviceId: service.id,
    contractValue,
    invoicedAmount,
    collectedAmount,
    outstandingAmount,
    paymentProgress,
    paymentStatus,
    hasIssuedInvoice,
    hasCommercialMismatch,
  };
}

/**
 * Calculates standardized financial metrics for a client across all services, invoices, and payments.
 * Single Source of Truth for:
 * - Clients Listing Table
 * - Client Detail Overview & Summary Cards
 * - Client Edit Page
 * - Reports
 */
export function calculateClientFinancials(params: {
  clientId: string;
  services: any[];
  invoices: any[];
  payments: any[];
  allocations: any[];
  nextDueDate?: string | null;
}): ClientFinancialMetrics {
  const { clientId, services, invoices, payments, allocations, nextDueDate } = params;

  // 1. Contract Value = Sum of active services (exclude Cancelled)
  const activeServices = (services || []).filter(
    (s: any) => (s.service_status || s.status) !== "Cancelled"
  );

  const contractValue = activeServices.reduce((sum: number, s: any) => {
    const amt =
      Number(s.total_amount) ||
      ((Number(s.service_fee) || 0) +
        (Number(s.govt_fee) || 0) +
        (Number(s.additional_fee) || 0) -
        (Number(s.discount) || 0));
    return sum + amt;
  }, 0);

  // 2. Invoiced Amount = Sum of issued valid invoices (exclude Draft, Void, Cancelled)
  const issuedInvoices = (invoices || []).filter(
    (inv: any) => !["Draft", "Void", "Cancelled"].includes(inv.status)
  );

  const invoicedAmount = issuedInvoices.reduce(
    (sum: number, inv: any) => sum + (Number(inv.total_amount ?? inv.totalAmount) || 0),
    0
  );

  // 3. Collected Amount = Sum of verified non-reversed payments received
  const confirmedPayments = (payments || []).filter(
    (p: any) =>
      ["Verified", "Completed", "Received"].includes(p.status) ||
      (!["Pending", "Failed", "Cancelled", "Reversed"].includes(p.status) && p.status !== undefined)
  );

  const collectedAmount = confirmedPayments.reduce(
    (sum: number, p: any) => sum + (Number(p.amount) || 0),
    0
  );

  // 4. Allocated Amount = Sum of verified payment allocations to issued invoices
  const issuedInvoiceIds = new Set(issuedInvoices.map((i: any) => i.id));
  const validAllocations = (allocations || []).filter((a: any) =>
    issuedInvoiceIds.has(a.invoice_id)
  );

  const allocatedAmount = validAllocations.reduce(
    (sum: number, a: any) => sum + (Number(a.allocated_amount ?? a.amount) || 0),
    0
  );

  // 5. Unallocated Advance = Verified payments received minus total allocated
  const unallocatedAdvance = Math.max(0, collectedAmount - allocatedAmount);

  // 6. Invoice Outstanding = Sum of unpaid balance_due on issued invoices
  const invoiceOutstanding = issuedInvoices.reduce((sum: number, inv: any) => {
    // If balance_due exists explicitly on invoice, use it; otherwise total_amount - amount_paid
    const bal =
      inv.balance_due !== undefined && inv.balance_due !== null
        ? Number(inv.balance_due)
        : Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0));
    return sum + bal;
  }, 0);

  // 7. Contract Balance = Contract Value - Collections credited
  const contractBalance = Math.max(0, contractValue - collectedAmount);

  // 8. Payment Status
  const todayStr = new Date().toISOString().split("T")[0];
  let paymentStatus: "Paid in full" | "Partially Paid" | "Upcoming" | "Overdue" = "Upcoming";

  if (contractValue > 0 && contractBalance === 0) {
    paymentStatus = "Paid in full";
  } else if (nextDueDate && nextDueDate < todayStr) {
    paymentStatus = "Overdue";
  } else if (collectedAmount > 0) {
    paymentStatus = "Partially Paid";
  }

  return {
    clientId,
    contractValue,
    invoicedAmount,
    collectedAmount,
    allocatedAmount,
    unallocatedAdvance,
    invoiceOutstanding,
    contractBalance,
    paymentStatus,
  };
}
