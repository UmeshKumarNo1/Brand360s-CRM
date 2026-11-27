import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface AuthorizedFinancialRecords {
  invoices: any[];
  payments: any[];
  allocations: any[];
}

/**
 * Shared server-side financial record fetcher.
 * Strictly scoped to `authorizedClientIds` (already authorized by user-scoped RLS on `clients` / `client_services`).
 * If user-scoped RLS returns no invoices for some authorized clients (e.g. an employee assigned to a service
 * on a client owned by another salesperson), it falls back to the server-side service-role client
 * ONLY for those missing authorized client IDs.
 */
export async function fetchAuthorizedClientsFinancialRecords(
  supabase: any,
  authorizedClientIds: string[]
): Promise<AuthorizedFinancialRecords> {
  if (!authorizedClientIds || authorizedClientIds.length === 0) {
    return { invoices: [], payments: [], allocations: [] };
  }

  const uniqueClientIds = Array.from(new Set(authorizedClientIds.filter(Boolean)));

  const [invoicesRes, paymentsRes, allocsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, client_id, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, amount_paid, balance_due, status, payment_terms, created_at, items:invoice_items(id, description, unit_price, quantity, tax_amount, total, client_service_id)"
      )
      .in("client_id", uniqueClientIds)
      .not("status", "in", '("Draft","Void","Cancelled")')
      .order("issue_date", { ascending: false }),
    supabase
      .from("payments")
      .select(
        "id, client_id, amount, payment_date, payment_method, transaction_ref, status, created_at, allocations:invoice_payment_allocations(id, invoice_id, allocated_amount, client_service_id, invoice_item_id, created_at)"
      )
      .in("client_id", uniqueClientIds)
      .order("payment_date", { ascending: false }),
    supabase
      .from("invoice_payment_allocations")
      .select("id, invoice_id, payment_id, allocated_amount, client_service_id, invoice_item_id, created_at"),
  ]);

  let invoices = invoicesRes.data || [];
  let payments = paymentsRes.data || [];
  let allocations = allocsRes.data || [];

  // Identify authorized clients that returned 0 invoices via user-scoped RLS
  const clientsWithInvoices = new Set(invoices.map((inv: any) => inv.client_id));
  const missingClientIds = uniqueClientIds.filter((id) => !clientsWithInvoices.has(id));

  if (missingClientIds.length > 0) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl && !serviceKey.includes("placeholder")) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const [adminInvs, adminPmts, adminAllocs] = await Promise.all([
        adminClient
          .from("invoices")
          .select(
            "id, client_id, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, amount_paid, balance_due, status, payment_terms, created_at, items:invoice_items(id, description, unit_price, quantity, tax_amount, total, client_service_id)"
          )
          .in("client_id", missingClientIds)
          .not("status", "in", '("Draft","Void","Cancelled")')
          .order("issue_date", { ascending: false }),
        adminClient
          .from("payments")
          .select(
            "id, client_id, amount, payment_date, payment_method, transaction_ref, status, created_at, allocations:invoice_payment_allocations(id, invoice_id, allocated_amount, client_service_id, invoice_item_id, created_at)"
          )
          .in("client_id", missingClientIds)
          .order("payment_date", { ascending: false }),
        adminClient
          .from("invoice_payment_allocations")
          .select("id, invoice_id, payment_id, allocated_amount, client_service_id, invoice_item_id, created_at"),
      ]);

      if (adminInvs.data && adminInvs.data.length > 0) {
        const existingInvIds = new Set(invoices.map((i: any) => i.id));
        invoices = [
          ...invoices,
          ...adminInvs.data.filter((i: any) => !existingInvIds.has(i.id)),
        ];
      }

      if (adminPmts.data && adminPmts.data.length > 0) {
        const existingPmtIds = new Set(payments.map((p: any) => p.id));
        payments = [
          ...payments,
          ...adminPmts.data.filter((p: any) => !existingPmtIds.has(p.id)),
        ];
      }

      if (adminAllocs.data && adminAllocs.data.length > 0) {
        const existingAllocIds = new Set(allocations.map((a: any) => a.id));
        allocations = [
          ...allocations,
          ...adminAllocs.data.filter((a: any) => !existingAllocIds.has(a.id)),
        ];
      }
    }
  }

  return { invoices, payments, allocations };
}

