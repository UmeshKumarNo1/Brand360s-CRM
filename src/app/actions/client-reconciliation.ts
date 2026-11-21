import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculateClientFinancials } from "@/lib/financial/financial-calculator";

export interface ReconciliationResult {
  success: boolean;
  error?: string | null;
  reconciledCount?: number;
  results?: Array<{
    clientId: string;
    companyName: string;
    previousContractValue: number;
    newContractValue: number;
    paymentsReceived: number;
    newBalanceReceivable: number;
    activeServicesCount: number;
  }>;
}

/**
 * Reconciles a client's Contract Value and Balance Receivable strictly using the centralized financial calculator.
 * - Contract Value = SUM of active services
 * - Payments Received = SUM of verified payments
 * - Balance Receivable = Sum of unpaid balance_due of issued valid invoices (Invoice Outstanding)
 */
export async function syncClientContractValueAction(clientId: string): Promise<{ success: boolean; error?: string | null; contractValue?: number }> {
  try {
    const supabase = await createClient();

    // 1. Fetch active client services
    const { data: services, error: sErr } = await supabase
      .from("client_services")
      .select("id, total_amount, service_fee, govt_fee, additional_fee, discount, service_status")
      .eq("client_id", clientId);

    if (sErr) {
      console.error("Error fetching services for sync:", sErr);
      return { success: false, error: sErr.message };
    }

    // 2. Fetch issued invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, total_amount, amount_paid, balance_due, status")
      .eq("client_id", clientId)
      .not("status", "in", '("Draft","Void","Cancelled")');

    // 3. Fetch verified payments
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, status")
      .eq("client_id", clientId);

    const confirmedPayments = (payments || []).filter(
      (p: any) =>
        ["Verified", "Completed", "Received"].includes(p.status) ||
        (!["Pending", "Failed", "Cancelled", "Reversed"].includes(p.status) && p.status !== undefined)
    );

    // 4. Fetch allocations
    const invoiceIds = (invoices || []).map((i: any) => i.id);
    let allocations: any[] = [];
    if (invoiceIds.length > 0) {
      const { data: allocs } = await supabase
        .from("invoice_payment_allocations")
        .select("id, invoice_id, payment_id, allocated_amount, client_service_id")
        .in("invoice_id", invoiceIds);
      allocations = allocs || [];
    }

    // 5. Find earliest pending/overdue installment
    const { data: installments } = await supabase
      .from("payment_schedules")
      .select("amount, amount_paid, due_date")
      .eq("client_id", clientId)
      .in("status", ["Pending", "Partially Paid", "Overdue"])
      .order("due_date", { ascending: true })
      .limit(1);

    const nextInst = installments && installments.length > 0 ? installments[0] : null;

    // Use Centralized Calculator
    const clientFinancials = calculateClientFinancials({
      clientId,
      services: services || [],
      invoices: invoices || [],
      payments: confirmedPayments,
      allocations,
      nextDueDate: nextInst?.due_date,
    });

    // Update the client record
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        contract_value: clientFinancials.contractValue,
        payments_received: clientFinancials.collectedAmount,
        balance_receivable: clientFinancials.invoiceOutstanding,
        next_payment_due_amount: nextInst ? Math.max(0, Number(nextInst.amount) - Number(nextInst.amount_paid)) : clientFinancials.invoiceOutstanding,
        next_payment_due_date: nextInst?.due_date || null,
        payment_status: clientFinancials.paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateErr) {
      console.error("Error updating client contract value:", updateErr);
      return { success: false, error: updateErr.message };
    }

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    revalidatePath("/payments");

    return { success: true, contractValue: clientFinancials.contractValue };
  } catch (err: any) {
    console.error("Exception in syncClientContractValueAction:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Admin action to reconcile all clients in the CRM.
 */
export async function reconcileAllClientsContractValuesAction(): Promise<ReconciliationResult> {
  try {
    const supabase = await createClient();

    const { data: clients, error: cErr } = await supabase
      .from("clients")
      .select("id, company_name, contract_value, payments_received");

    if (cErr || !clients) {
      return { success: false, error: cErr?.message || "Failed to load clients." };
    }

    const results = [];
    for (const c of clients) {
      const prevVal = Number(c.contract_value) || 0;
      const res = await syncClientContractValueAction(c.id);
      results.push({
        clientId: c.id,
        companyName: c.company_name,
        previousContractValue: prevVal,
        newContractValue: res.contractValue ?? prevVal,
        paymentsReceived: Number(c.payments_received) || 0,
        newBalanceReceivable: Math.max(0, (res.contractValue ?? prevVal) - (Number(c.payments_received) || 0)),
        activeServicesCount: 0,
      });
    }

    revalidatePath("/clients");
    revalidatePath("/dashboard");
    revalidatePath("/payments");

    return {
      success: true,
      reconciledCount: results.length,
      results,
    };
  } catch (err: any) {
    console.error("Exception in reconcileAllClientsContractValuesAction:", err);
    return { success: false, error: err.message };
  }
}
