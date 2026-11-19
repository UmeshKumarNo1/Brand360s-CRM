import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
 * Reconciles a client's Contract Value and Balance Receivable strictly from active client services.
 * Active services = client_services where service_status <> 'Cancelled'
 * Contract Value = SUM(COALESCE(total_amount, service_fee + govt_fee, 0))
 * Balance Receivable = GREATEST(0, Contract Value - payments_received)
 */
export async function syncClientContractValueAction(clientId: string): Promise<{ success: boolean; error?: string | null; contractValue?: number }> {
  try {
    const supabase = await createClient();

    // 1. Fetch active client services
    const { data: services, error: sErr } = await supabase
      .from("client_services")
      .select("id, total_amount, service_fee, govt_fee, service_status")
      .eq("client_id", clientId);

    if (sErr) {
      console.error("Error fetching services for sync:", sErr);
      return { success: false, error: sErr.message };
    }

    const activeServices = (services || []).filter((s: any) => s.service_status !== "Cancelled");
    const newContractValue = activeServices.reduce((sum: number, s: any) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0));
      return sum + amt;
    }, 0);

    // 2. Fetch verified payments
    const { data: payments, error: pErr } = await supabase
      .from("payments")
      .select("amount")
      .eq("client_id", clientId)
      .eq("status", "Verified");

    const totalVerifiedReceived = (payments || []).reduce(
      (sum: number, p: any) => sum + (Number(p.amount) || 0),
      0
    );

    const newBalanceReceivable = Math.max(0, newContractValue - totalVerifiedReceived);

    // 3. Find earliest pending/overdue installment
    const { data: installments } = await supabase
      .from("payment_schedules")
      .select("amount, amount_paid, due_date")
      .eq("client_id", clientId)
      .in("status", ["Pending", "Partially Paid", "Overdue"])
      .order("due_date", { ascending: true })
      .limit(1);

    const nextInst = installments && installments.length > 0 ? installments[0] : null;
    const todayStr = new Date().toISOString().split("T")[0];

    let paymentStatus: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
    if (newContractValue > 0 && newBalanceReceivable === 0) {
      paymentStatus = "Paid in full";
    } else if (nextInst?.due_date && nextInst.due_date < todayStr) {
      paymentStatus = "Overdue";
    } else if (totalVerifiedReceived > 0) {
      paymentStatus = "Partially Paid";
    }

    // 4. Update the client
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        contract_value: newContractValue,
        payments_received: totalVerifiedReceived,
        balance_receivable: newBalanceReceivable,
        next_payment_due_amount: nextInst ? Math.max(0, Number(nextInst.amount) - Number(nextInst.amount_paid)) : newBalanceReceivable,
        next_payment_due_date: nextInst?.due_date || null,
        payment_status: paymentStatus,
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

    return { success: true, contractValue: newContractValue };
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

