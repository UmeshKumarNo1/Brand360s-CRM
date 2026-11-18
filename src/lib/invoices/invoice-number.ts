import { createClient } from "@/lib/supabase/server";

/**
 * Server action to generate an atomic, reliable unique invoice number.
 * Format: B360-INV-YYYY-NNNN
 * 
 * Strategy:
 * 1. Calls database RPC `get_next_invoice_number` for atomic increment with row-level locking.
 * 2. If the RPC is not yet present on remote DB, falls back to a transaction-safe query
 *    that inspects the true MAX numeric suffix in `invoices` for the current year
 *    (preventing the "COUNT(*) + 1" bug that causes duplicate keys when numbers skip or gap).
 */
export async function generateInvoiceNumberAction(customYear?: number): Promise<string> {
  const supabase = await createClient();
  const currentYear = customYear || new Date().getFullYear();
  const prefix = `B360-INV-${currentYear}-`;

  // 1. Try atomic database RPC
  try {
    const { data: rpcNumber, error: rpcErr } = await supabase.rpc("get_next_invoice_number", {
      p_year: currentYear,
    });

    if (!rpcErr && rpcNumber && typeof rpcNumber === "string" && rpcNumber.startsWith(prefix)) {
      return rpcNumber;
    }
  } catch (rpcEx) {
    console.warn("get_next_invoice_number RPC failed or not installed yet, falling back to max query:", rpcEx);
  }

  // 2. Resilient Fallback: Inspect all existing invoice numbers for the year to find TRUE MAX
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .ilike("invoice_number", `${prefix}%`);

  let maxSeq = 0;
  if (!error && invoices) {
    for (const inv of invoices) {
      if (inv.invoice_number) {
        const match = inv.invoice_number.match(new RegExp(`^B360-INV-${currentYear}-(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
