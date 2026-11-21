"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";
import { generatePaymentReceiptAction } from "./receipts";

export interface PaymentActionState {
  error?: string | null;
  success?: boolean;
}

export interface PaymentAllocationItem {
  invoiceId: string;
  amount: number;
}

export interface PaymentAllocationResponse {
  success: boolean;
  error?: string | null;
  allocations?: any[];
}

export interface EditPaymentParams {
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef?: string;
  notes?: string;
}

export interface ReversePaymentParams {
  paymentId: string;
  reason: string;
}

export async function fetchPaymentsAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      id,
      client_id,
      amount,
      payment_date,
      payment_method,
      transaction_ref,
      status,
      notes,
      created_at,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contract_value,
        balance_receivable,
        assigned_salesperson,
        created_by
      ),
      recorder:profiles!recorded_by (
        full_name,
        email
      ),
      allocations:invoice_payment_allocations (
        id,
        invoice_id,
        allocated_amount,
        created_at,
        invoice:invoices!invoice_id (
          id,
          invoice_number,
          total_amount,
          amount_paid,
          balance_due,
          status
        )
      )
    `)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  return (payments || []).map((p: any) => {
    const totalAmount = Math.round((Number(p.amount) || 0) * 100) / 100;
    const allocations = p.allocations || [];
    const totalAllocated = Math.round(
      allocations.reduce(
        (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
        0
      ) * 100
    ) / 100;
    const availableAmount = Math.max(0, Math.round((totalAmount - totalAllocated) * 100) / 100);

    let allocationStatus: "Unallocated" | "Partially Allocated" | "Fully Allocated" = "Unallocated";
    if (totalAmount > 0 && availableAmount <= 0.009) {
      allocationStatus = "Fully Allocated";
    } else if (totalAllocated > 0.009 && availableAmount > 0.009) {
      allocationStatus = "Partially Allocated";
    }

    return {
      id: p.id,
      clientId: p.client?.id || p.client_id,
      companyName: p.client?.company_name || "Unknown Company",
      clientCode: p.client?.client_code || "B360-1000",
      amount: totalAmount,
      totalAllocated,
      availableAmount,
      allocationStatus,
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      transactionRef: p.transaction_ref || "-",
      status: p.status,
      recordedBy: p.recorder?.full_name || "System",
      notes: p.notes,
      allocations,
    };
  });
}

export async function fetchAllInstallmentsAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  const { data: schedules, error } = await supabase
    .from("payment_schedules")
    .select(`
      id,
      client_id,
      invoice_id,
      title,
      installment_number,
      amount,
      amount_paid,
      due_date,
      status,
      paid_date,
      notes,
      cancel_reason,
      cancelled_at,
      cancelled_by,
      created_at,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contract_value,
        balance_receivable,
        assigned_salesperson,
        created_by
      ),
      invoice:invoices!invoice_id (
        id,
        invoice_number,
        total_amount,
        amount_paid,
        balance_due,
        status
      ),
      installment_allocations:installment_payment_allocations (
        id,
        allocated_amount,
        created_at,
        payment:payments!payment_id (
          id,
          payment_date,
          payment_method,
          transaction_ref,
          status,
          recorded_by,
          recorder:profiles!recorded_by (full_name)
        )
      )
    `)
    .order("due_date", { ascending: true });

  if (error) {
    // If migration 010 columns or tables are still pending in DB, fallback gracefully
    console.warn("Retrying installments query with basic schema:", error.message);
    const { data: basicSchedules, error: basicErr } = await supabase
      .from("payment_schedules")
      .select(`
        id,
        client_id,
        title,
        installment_number,
        amount,
        amount_paid,
        due_date,
        status,
        paid_date,
        notes,
        created_at,
        client:clients!client_id (
          id,
          company_name,
          client_code,
          contract_value,
          balance_receivable
        )
      `)
      .order("due_date", { ascending: true });

    if (basicErr) {
      console.error("Error fetching installments fallback:", basicErr);
      return [];
    }

    return (basicSchedules || []).map((s: any) => {
      const amount = Number(s.amount) || 0;
      const amountPaid = Number(s.amount_paid) || 0;
      const remaining = Math.max(0, amount - amountPaid);
      const today = new Date().toISOString().split("T")[0];
      const isOverdue = s.due_date < today && s.status !== "Paid in full" && remaining > 0;

      let computedStatus = s.status || "Upcoming";
      if (s.status === "Cancelled") {
        computedStatus = "Cancelled";
      } else if (amountPaid >= amount && amount > 0) {
        computedStatus = "Paid in full";
      } else if (isOverdue) {
        computedStatus = "Overdue";
      } else if (amountPaid > 0) {
        computedStatus = "Partially Paid";
      } else if (s.due_date === today) {
        computedStatus = "Due";
      } else {
        computedStatus = "Upcoming";
      }

      return {
        id: s.id,
        clientId: s.client?.id || s.client_id,
        companyName: s.client?.company_name || "Unknown Company",
        clientCode: s.client?.client_code || "B360-1000",
        invoiceId: null,
        invoiceNumber: null,
        invoiceTotal: null,
        invoiceBalance: null,
        title: s.title || `Milestone ${s.installment_number || 1}`,
        installmentNumber: s.installment_number || 1,
        amount,
        amountPaid,
        remaining,
        dueDate: s.due_date,
        status: computedStatus,
        paidDate: s.paid_date,
        notes: s.notes,
        cancelReason: null,
        cancelledAt: null,
        allocations: [],
        createdAt: s.created_at,
      };
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (schedules || []).map((s: any) => {
    const amount = Number(s.amount) || 0;
    const amountPaid = Number(s.amount_paid) || 0;
    const remaining = Math.max(0, amount - amountPaid);
    const isOverdue = s.due_date < today && s.status !== "Paid in full" && s.status !== "Cancelled" && remaining > 0;

    let computedStatus = s.status || "Upcoming";
    if (s.status === "Cancelled") {
      computedStatus = "Cancelled";
    } else if (amountPaid >= amount && amount > 0) {
      computedStatus = "Paid in full";
    } else if (isOverdue) {
      computedStatus = "Overdue";
    } else if (amountPaid > 0) {
      computedStatus = "Partially Paid";
    } else if (s.due_date === today) {
      computedStatus = "Due";
    } else {
      computedStatus = "Upcoming";
    }

    const allocations = (s.installment_allocations || []).map((ia: any) => ({
      id: ia.id,
      amount: Number(ia.allocated_amount) || 0,
      createdAt: ia.created_at,
      paymentId: ia.payment?.id,
      paymentDate: ia.payment?.payment_date,
      paymentMethod: ia.payment?.payment_method,
      transactionRef: ia.payment?.transaction_ref,
      status: ia.payment?.status,
      recordedBy: ia.payment?.recorder?.full_name || "System",
    }));

    return {
      id: s.id,
      clientId: s.client?.id || s.client_id,
      companyName: s.client?.company_name || "Unknown Company",
      clientCode: s.client?.client_code || "B360-1000",
      invoiceId: s.invoice?.id || s.invoice_id || null,
      invoiceNumber: s.invoice?.invoice_number || null,
      invoiceTotal: s.invoice ? Number(s.invoice.total_amount) : null,
      invoiceBalance: s.invoice ? Number(s.invoice.balance_due) : null,
      title: s.title || `Milestone ${s.installment_number || 1}`,
      installmentNumber: s.installment_number || 1,
      amount,
      amountPaid,
      remaining,
      dueDate: s.due_date,
      status: computedStatus,
      paidDate: s.paid_date,
      notes: s.notes,
      cancelReason: s.cancel_reason,
      cancelledAt: s.cancelled_at,
      allocations,
      createdAt: s.created_at,
    };
  });
}

export async function recordPaymentAction(
  prevState: PaymentActionState | null,
  formData: FormData
): Promise<PaymentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required to record payments." };

  const clientId = formData.get("client_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const paymentDate = formData.get("payment_date") as string;
  const paymentMethod = formData.get("payment_method") as string;
  const transactionRef = (formData.get("transaction_ref") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const status = (formData.get("status") as string) || "Verified";
  const installmentId = (formData.get("installment_id") as string) || null;

  if (!clientId || !amount || isNaN(amount) || amount <= 0 || !paymentDate || !paymentMethod) {
    return { error: "Please enter a valid client, positive payment amount, date, and payment method." };
  }

  // 0. Invoice-Based Payment Limit Validation
  // Validate that payment does not exceed the remaining outstanding balance of issued invoices (including GST)
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, company_name, assigned_salesperson, created_by")
    .eq("id", clientId)
    .single();

  if (clientErr || !client) {
    return { error: "Client record not found." };
  }

  // Fetch issued, eligible invoices (excluding Draft, Void, Cancelled)
  const { data: clientInvoices } = await supabase
    .from("invoices")
    .select("id, total_amount, amount_paid, balance_due, status")
    .eq("client_id", clientId)
    .not("status", "in", '("Draft","Void","Cancelled")');

  const remainingInvoiceBalance = (clientInvoices || []).reduce((sum, inv) => {
    const bal = inv.balance_due !== undefined && inv.balance_due !== null
      ? Number(inv.balance_due)
      : Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0));
    return sum + bal;
  }, 0);

  if (status === "Verified") {
    if (remainingInvoiceBalance <= 0) {
      return {
        error: `This client has no outstanding invoice balance. All issued invoices have been fully paid. Please generate an invoice before recording additional payments.`,
      };
    }

    if (amount > remainingInvoiceBalance + 0.009) {
      return {
        error: `Payment amount (₹${amount.toLocaleString("en-IN")}) exceeds the remaining outstanding invoice balance (₹${remainingInvoiceBalance.toLocaleString("en-IN")}). Maximum permitted payment: ₹${remainingInvoiceBalance.toLocaleString("en-IN")}. Please generate an invoice for any additional contract scope before recording this payment.`,
      };
    }
  }

  // 0b. Pre-validate invoice allocations if provided
  const allocationsJson = formData.get("invoice_allocations") as string;
  let parsedAllocations: { invoiceId: string; amount: number }[] = [];
  if (allocationsJson && status === "Verified") {
    try {
      const parsed = JSON.parse(allocationsJson);
      if (Array.isArray(parsed)) {
        parsedAllocations = parsed.filter((l: any) => l.invoiceId && Number(l.amount) > 0);
      }
    } catch {
      return { error: "Invalid invoice allocation format." };
    }

    // Verify each allocation against invoice's live balance
    const totalAlloc = parsedAllocations.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    if (totalAlloc > amount + 0.009) {
      return { error: `Total allocated to invoices (₹${totalAlloc.toLocaleString("en-IN")}) exceeds payment amount (₹${amount.toLocaleString("en-IN")}).` };
    }

    for (const alloc of parsedAllocations) {
      const invMatch = (clientInvoices || []).find((i: any) => i.id === alloc.invoiceId);
      if (invMatch) {
        const invBal = invMatch.balance_due !== undefined && invMatch.balance_due !== null
          ? Number(invMatch.balance_due)
          : Math.max(0, (Number(invMatch.total_amount) || 0) - (Number(invMatch.amount_paid) || 0));
        if (Number(alloc.amount) > invBal + 0.009) {
          return {
            error: `Allocated amount ₹${Number(alloc.amount).toLocaleString("en-IN")} exceeds invoice balance ₹${invBal.toLocaleString("en-IN")}.`,
          };
        }
      }
    }
  }

  // 1. Record payment transaction atomically directly in the payments table
  let newPaymentId: string | null = null;
  const { data: newPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      client_id: clientId,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      status,
      recorded_by: user.id,
      verified_by: status === "Verified" ? user.id : null,
      notes,
    })
    .select("id")
    .single();

  if (paymentError || !newPayment) {
    return { error: paymentError?.message || "Failed to record payment transaction." };
  }
  newPaymentId = newPayment.id;

  // 1b. Check if invoice allocations were passed with this payment
  if (parsedAllocations.length > 0 && status === "Verified" && newPaymentId) {
    try {
      // Run allocation action for this new payment
      await allocatePaymentToInvoicesAction(newPaymentId, parsedAllocations);
    } catch (allocErr: any) {
      console.error("Error processing initial invoice allocations:", allocErr);
    }
  }

  // 2. If an installment milestone was explicitly selected and the payment is verified, update the installment
  if (installmentId && status === "Verified") {
    const { data: schedule, error: schedFetchError } = await supabase
      .from("payment_schedules")
      .select("id, amount, amount_paid, due_date")
      .eq("id", installmentId)
      .single();

    if (!schedFetchError && schedule) {
      const currentPaid = Number(schedule.amount_paid) || 0;
      const targetAmount = Number(schedule.amount) || 0;
      const newPaid = currentPaid + amount;
      const today = new Date().toISOString().split("T")[0];

      let newStatus = "Pending";
      if (newPaid >= targetAmount) {
        newStatus = "Paid in full";
      } else if (newPaid > 0) {
        newStatus = schedule.due_date < today ? "Overdue" : "Partially Paid";
      } else if (schedule.due_date < today) {
        newStatus = "Overdue";
      }

      await supabase
        .from("payment_schedules")
        .update({
          amount_paid: newPaid,
          status: newStatus,
          paid_date: newPaid >= targetAmount ? paymentDate : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", installmentId);
    }
  }

  // 3. Automatically generate / link payment receipt in the background (non-blocking)
  if (newPaymentId) {
    try {
      await generatePaymentReceiptAction({
        paymentId: newPaymentId,
        installmentId: installmentId || undefined,
      });
    } catch (receiptErr: any) {
      console.warn("[recordPaymentAction] Non-fatal receipt generation background notice:", receiptErr);
    }
  }

  revalidatePath("/payments");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function createInstallmentAction(
  prevState: PaymentActionState | null,
  formData: FormData
): Promise<PaymentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const clientId = formData.get("client_id") as string;
  const invoiceId = (formData.get("invoice_id") as string) || null;
  const title = (formData.get("title") as string)?.trim() || "Installment";
  const amount = parseFloat(formData.get("amount") as string);
  const dueDate = formData.get("due_date") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!clientId || !amount || isNaN(amount) || amount <= 0 || !dueDate) {
    return { error: "Please provide valid installment title, positive amount, and due date." };
  }

  // Count existing schedules for installment_number
  const { count } = await supabase
    .from("payment_schedules")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  const installmentNumber = (count || 0) + 1;
  const today = new Date().toISOString().split("T")[0];
  const initialStatus = dueDate < today ? "Overdue" : dueDate === today ? "Due" : "Upcoming";

  const { error } = await supabase
    .from("payment_schedules")
    .insert({
      client_id: clientId,
      invoice_id: invoiceId,
      title,
      installment_number: installmentNumber,
      amount,
      amount_paid: 0,
      due_date: dueDate,
      status: initialStatus,
      notes,
    });

  if (error) {
    console.error("Error creating installment schedule:", error);
    // Provide user-friendly guidance if constraint is pending migration
    if (error.message?.includes("payment_schedules_status_check")) {
      return { 
        error: "Database constraint mismatch: Please run migration 020_payment_schedules_status_fix.sql in Supabase to support 'Upcoming' and 'Due' milestone statuses." 
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payments");
  revalidatePath("/clients");
  return { success: true };
}

export async function updateInstallmentAction(
  prevState: PaymentActionState | null,
  formData: FormData
): Promise<PaymentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const installmentId = formData.get("installment_id") as string;
  const clientId = formData.get("client_id") as string;
  const invoiceId = (formData.get("invoice_id") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const dueDate = formData.get("due_date") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!installmentId || !title || !amount || isNaN(amount) || amount <= 0 || !dueDate) {
    return { error: "Please provide all required fields with valid values." };
  }

  // Fetch current schedule to re-evaluate status against updated amount/date
  const { data: current } = await supabase
    .from("payment_schedules")
    .select("amount_paid, status")
    .eq("id", installmentId)
    .single();

  if (current?.status === "Cancelled") {
    return { error: "Cancelled installments cannot be modified." };
  }

  const amountPaid = Number(current?.amount_paid) || 0;
  const today = new Date().toISOString().split("T")[0];

  let newStatus = "Upcoming";
  if (amountPaid >= amount) {
    newStatus = "Paid in full";
  } else if (amountPaid > 0) {
    newStatus = "Partially Paid";
  } else if (dueDate < today) {
    newStatus = "Overdue";
  } else if (dueDate === today) {
    newStatus = "Due";
  }

  const updatePayload: any = {
    title,
    amount,
    due_date: dueDate,
    status: newStatus,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (invoiceId !== undefined) {
    updatePayload.invoice_id = invoiceId;
  }

  const { error } = await supabase
    .from("payment_schedules")
    .update(updatePayload)
    .eq("id", installmentId);

  if (error) {
    console.error("Error updating installment schedule:", error);
    if (error.message?.includes("payment_schedules_status_check")) {
      return { 
        error: "Database constraint mismatch: Please run migration 020_payment_schedules_status_fix.sql in Supabase to support 'Upcoming' and 'Due' milestone statuses." 
      };
    }
    return { error: error.message };
  }

  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payments");
  revalidatePath("/clients");
  return { success: true };
}

export async function deleteInstallmentAction(installmentId: string, clientId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("payment_schedules")
    .delete()
    .eq("id", installmentId);

  if (error) {
    return { error: error.message };
  }

  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payments");
  revalidatePath("/clients");
  return { success: true };
}

export async function cancelInstallmentAction(
  installmentId: string,
  clientId: string,
  cancelReason: string
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Only administrators can cancel installment schedules." };
  }

  const { error } = await supabase
    .from("payment_schedules")
    .update({
      status: "Cancelled",
      cancel_reason: cancelReason || "Cancelled by admin",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", installmentId);

  if (error) {
    return { error: error.message };
  }

  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payments");
  revalidatePath("/clients");
  return { success: true };
}

export async function fetchClientFinancialsAction(clientId: string) {
  const supabase = await createClient();

  // Fetch payments with allocations
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      payment_date,
      payment_method,
      transaction_ref,
      status,
      notes,
      recorder:profiles!recorded_by (full_name),
      allocations:invoice_payment_allocations (
        id,
        invoice_id,
        allocated_amount,
        created_at,
        invoice:invoices!invoice_id (
          id,
          invoice_number,
          total_amount,
          amount_paid,
          balance_due,
          status
        )
      )
    `)
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false });

  const enrichedPayments = (payments || []).map((p: any) => {
    const totalAmount = Math.round((Number(p.amount) || 0) * 100) / 100;
    const allocations = p.allocations || [];
    const totalAllocated = Math.round(
      allocations.reduce(
        (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
        0
      ) * 100
    ) / 100;
    const availableAmount = Math.max(0, Math.round((totalAmount - totalAllocated) * 100) / 100);

    let allocationStatus: "Unallocated" | "Partially Allocated" | "Fully Allocated" = "Unallocated";
    if (totalAmount > 0 && availableAmount <= 0.009) {
      allocationStatus = "Fully Allocated";
    } else if (totalAllocated > 0.009 && availableAmount > 0.009) {
      allocationStatus = "Partially Allocated";
    }

    return {
      ...p,
      amount: totalAmount,
      totalAllocated,
      availableAmount,
      allocationStatus,
    };
  });

  // Fetch installment schedules
  const { data: schedules } = await supabase
    .from("payment_schedules")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  const today = new Date().toISOString().split("T")[0];

  const enrichedSchedules = (schedules || []).map((s: any) => {
    const amount = Number(s.amount) || 0;
    const amountPaid = Number(s.amount_paid) || 0;
    const remaining = Math.max(0, amount - amountPaid);
    const isOverdue = s.due_date < today && s.status !== "Paid in full" && remaining > 0;

    let computedStatus = s.status;
    if (amountPaid >= amount && amount > 0) {
      computedStatus = "Paid in full";
    } else if (isOverdue) {
      computedStatus = "Overdue";
    } else if (amountPaid > 0) {
      computedStatus = "Partially Paid";
    } else {
      computedStatus = "Pending";
    }

    return {
      ...s,
      amount,
      amount_paid: amountPaid,
      remaining,
      computed_status: computedStatus,
    };
  });

  return {
    payments: enrichedPayments || [],
    schedules: enrichedSchedules,
  };
}

/**
 * Fetch open / eligible invoices for a client for payment allocation
 */
export async function fetchClientInvoicesForAllocationAction(clientId: string) {
  if (!clientId || typeof clientId !== "string" || clientId.trim() === "") {
    return [];
  }

  const supabase = await createClient();
  const cleanClientId = clientId.trim();

  // 1. Fetch invoices directly for this client UUID
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      client_id,
      issue_date,
      due_date,
      total_amount,
      amount_paid,
      balance_due,
      status
    `)
    .eq("client_id", cleanClientId)
    .order("issue_date", { ascending: true });

  if (error) {
    console.error("Error fetching client invoices for allocation:", error);
    return [];
  }

  // 2. Fetch existing allocations for these invoices to calculate real live balances
  const invoiceIds = (invoices || []).map((i: any) => i.id);
  let liveAllocationsByInvoice: Record<string, number> = {};

  if (invoiceIds.length > 0) {
    const { data: allocationsData } = await supabase
      .from("invoice_payment_allocations")
      .select("invoice_id, allocated_amount")
      .in("invoice_id", invoiceIds);

    if (allocationsData && allocationsData.length > 0) {
      allocationsData.forEach((a: any) => {
        liveAllocationsByInvoice[a.invoice_id] =
          (liveAllocationsByInvoice[a.invoice_id] || 0) + (Number(a.allocated_amount) || 0);
      });
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (invoices || [])
    .filter((inv: any) => {
      // Exclude cancelled invoices regardless of case
      const statusStr = String(inv.status || "").toLowerCase().trim();
      return statusStr !== "cancelled";
    })
    .map((inv: any) => {
      const total = Number(inv.total_amount) || 0;
      // Use sum from invoice_payment_allocations if available, otherwise fallback to inv.amount_paid
      const allocSum = liveAllocationsByInvoice[inv.id];
      const paid = typeof allocSum === "number" ? allocSum : Number(inv.amount_paid) || 0;
      const balance = Math.max(0, total - paid);

      let computedStatus = inv.status || "Issued";
      if (balance <= 0 && total > 0) {
        computedStatus = "Paid";
      } else if (paid > 0) {
        computedStatus = inv.due_date < today ? "Overdue" : "Partially Paid";
      } else if (inv.due_date < today) {
        computedStatus = "Overdue";
      } else {
        computedStatus = "Issued";
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        totalAmount: total,
        amountPaid: paid,
        balanceDue: balance,
        status: computedStatus,
      };
    });
}

/**
 * Allocate payment amounts to one or multiple invoices atomically
 */
export async function allocatePaymentToInvoicesAction(
  paymentId: string,
  allocations: { invoiceId: string; amount: number }[]
): Promise<PaymentAllocationResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required to allocate payments." };

  if (!paymentId) return { success: false, error: "Payment ID is required." };
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return { success: false, error: "Please specify at least one invoice allocation." };
  }

  // 1. Verify user role & permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  // 2. Fetch payment record with client details & existing allocations
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(`
      id,
      client_id,
      amount,
      status,
      client:clients!client_id (
        id,
        assigned_salesperson,
        created_by
      ),
      existing_allocations:invoice_payment_allocations (
        allocated_amount
      )
    `)
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return { success: false, error: "Payment record not found." };
  }

  const client = Array.isArray(payment.client) ? payment.client[0] : payment.client;
  const isAuthorized = isAdmin || client?.assigned_salesperson === user.id || client?.created_by === user.id;

  if (!isAuthorized) {
    return {
      success: false,
      error: "You are not authorized to allocate payments for this client.",
    };
  }

  // 3. Compute available unallocated amount with decimal precision protection
  const paymentTotal = Math.round((Number(payment.amount) || 0) * 100) / 100;
  const currentAllocated = Math.round(
    (payment.existing_allocations || []).reduce(
      (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
      0
    ) * 100
  ) / 100;
  const paymentAvailable = Math.max(0, Math.round((paymentTotal - currentAllocated) * 100) / 100);

  if (paymentAvailable <= 0.009) {
    return {
      success: false,
      error: "This payment is already fully allocated. No remaining unallocated balance is available.",
    };
  }

  const totalNewAllocation = Math.round(
    allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) * 100
  ) / 100;

  if (totalNewAllocation <= 0) {
    return { success: false, error: "Total allocation amount must be greater than zero." };
  }

  if (totalNewAllocation > paymentAvailable + 0.009) {
    return {
      success: false,
      error: `Total allocations (₹${totalNewAllocation.toLocaleString("en-IN")}) exceed available payment balance (₹${paymentAvailable.toLocaleString("en-IN")}).`,
    };
  }

  // 4. Validate each allocation against invoice balance
  const results = [];
  const today = new Date().toISOString().split("T")[0];

  for (const item of allocations) {
    const allocAmount = Number(item.amount) || 0;
    if (allocAmount <= 0) continue;

    // Fetch invoice along with line items to identify linked client_service_id
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("id, client_id, total_amount, amount_paid, balance_due, status, due_date, items:invoice_items(id, client_service_id)")
      .eq("id", item.invoiceId)
      .single();

    if (invError || !inv) {
      return { success: false, error: `Invoice ${item.invoiceId} could not be found.` };
    }

    if (inv.client_id !== payment.client_id) {
      return { success: false, error: "Invoice and payment belong to different clients." };
    }

    if (inv.status === "Cancelled") {
      return { success: false, error: "Cannot allocate payment to a cancelled invoice." };
    }

    if (allocAmount > (Number(inv.balance_due) + 0.001)) {
      return {
        success: false,
        error: `Allocation amount ₹${allocAmount} exceeds invoice balance ₹${inv.balance_due}.`,
      };
    }

    // Resolve client_service_id from invoice line items
    const resolvedItem = (inv.items || []).find((it: any) => it.client_service_id);
    const resolvedServiceId = resolvedItem?.client_service_id || null;
    const resolvedItemId = resolvedItem?.id || null;

    // Try RPC first for atomicity (allocate_payment_to_invoice with service awareness)
    let allocatedSuccess = false;

    const { data: rpcData, error: rpcError } = await supabase.rpc("allocate_payment_to_invoice", {
      p_payment_id: paymentId,
      p_invoice_id: item.invoiceId,
      p_amount: allocAmount,
      p_invoice_item_id: resolvedItemId,
      p_client_service_id: resolvedServiceId,
    });

    if (!rpcError && rpcData && (rpcData.success === true || (typeof rpcData === "object" && !rpcData.error))) {
      results.push(rpcData);
      allocatedSuccess = true;
    } else {
      const { data: recData, error: recError } = await supabase.rpc("reconcile_and_allocate_payment", {
        p_payment_id: paymentId,
        p_invoice_id: item.invoiceId,
        p_amount: allocAmount,
      });

      if (!recError && recData && (recData.success === true || (typeof recData === "object" && !recData.error))) {
        results.push(recData);
        allocatedSuccess = true;
      }
    }

    if (!allocatedSuccess) {
      // Fallback to transactional client-side steps if RPC isn't executed in DB yet
      const { data: insertedAlloc, error: allocErr } = await supabase
        .from("invoice_payment_allocations")
        .insert({
          payment_id: paymentId,
          invoice_id: item.invoiceId,
          allocated_amount: allocAmount,
          client_service_id: resolvedServiceId,
          invoice_item_id: resolvedItemId,
        })
        .select()
        .single();

      if (allocErr) {
        return { success: false, error: allocErr.message || "Failed to create payment allocation." };
      }

      // Re-aggregate invoice paid amount
      const { data: allInvoicesAllocations } = await supabase
        .from("invoice_payment_allocations")
        .select("allocated_amount")
        .eq("invoice_id", item.invoiceId);

      const newPaid = (allInvoicesAllocations || []).reduce(
        (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
        0
      );
      const totalInvAmount = Number(inv.total_amount) || 0;
      const newBalance = Math.max(0, totalInvAmount - newPaid);

      let newStatus = inv.status;
      if (newBalance <= 0) {
        newStatus = "Paid";
      } else if (newPaid > 0) {
        newStatus = inv.due_date < today ? "Overdue" : "Partially Paid";
      } else if (inv.due_date < today) {
        newStatus = "Overdue";
      } else {
        newStatus = "Issued";
      }

      await supabase
        .from("invoices")
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.invoiceId);

      // Distribute to client installments fallback
      const { data: clientInstallments } = await supabase
        .from("payment_schedules")
        .select("id, amount, amount_paid, due_date, status, invoice_id")
        .eq("client_id", payment.client_id)
        .neq("status", "Cancelled")
        .order("due_date", { ascending: true });

      let unallocatedRem = allocAmount;
      if (clientInstallments && clientInstallments.length > 0) {
        for (const inst of clientInstallments) {
          if (unallocatedRem <= 0) break;
          const instAmt = Number(inst.amount) || 0;
          const instPaid = Number(inst.amount_paid) || 0;
          const instRem = Math.max(0, instAmt - instPaid);

          if (instRem > 0) {
            const take = Math.min(unallocatedRem, instRem);
            const newInstPaid = instPaid + take;
            let instStat = "Upcoming";
            if (newInstPaid >= instAmt) {
              instStat = "Paid in full";
            } else if (newInstPaid > 0) {
              instStat = "Partially Paid";
            } else if (inst.due_date < today) {
              instStat = "Overdue";
            } else if (inst.due_date === today) {
              instStat = "Due";
            }

            await supabase
              .from("payment_schedules")
              .update({
                amount_paid: newInstPaid,
                status: instStat,
                invoice_id: inst.invoice_id || item.invoiceId,
                paid_date: newInstPaid >= instAmt ? today : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", inst.id);

            // Record installment allocation entry if table exists
            try {
              await supabase
                .from("installment_payment_allocations")
                .insert({
                  installment_id: inst.id,
                  payment_id: paymentId,
                  invoice_allocation_id: insertedAlloc.id,
                  allocated_amount: take,
                });
            } catch (err: any) {
              console.warn("Could not insert installment_payment_allocations record:", err);
            }

            unallocatedRem -= take;
          }
        }
      }

      results.push(insertedAlloc);
    }
  }

  // 5. Revalidate affected paths
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/clients");
  revalidatePath(`/clients/${payment.client_id}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    allocations: results,
  };
}

/**
 * Feature 014: Edit Payment (Unallocated or Partially Allocated)
 * Enforces that payment amount cannot be reduced below already allocated total.
 * Preserves payment ID, creation timestamp, and recorder info.
 */
export async function editPaymentAction(params: EditPaymentParams): Promise<PaymentActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  if (!params.paymentId) {
    return { success: false, error: "Payment ID is required." };
  }

  const newAmount = Number(params.amount);
  if (isNaN(newAmount) || newAmount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  if (!params.paymentDate) {
    return { success: false, error: "Payment date is required." };
  }

  const validMethods = [
    "Bank Transfer / NEFT",
    "UPI / QR",
    "Credit Card",
    "Debit Card",
    "Cheque",
    "Cash",
    "Other",
  ];
  if (!params.paymentMethod || !validMethods.includes(params.paymentMethod)) {
    return { success: false, error: "Invalid payment method selected." };
  }

  // 1. Fetch current payment details
  const { data: existingPayment, error: fetchErr } = await supabase
    .from("payments")
    .select(`
      id,
      client_id,
      amount,
      payment_date,
      payment_method,
      transaction_ref,
      notes,
      status,
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      ),
      allocations:invoice_payment_allocations (
        id,
        allocated_amount
      )
    `)
    .eq("id", params.paymentId)
    .single();

  if (fetchErr || !existingPayment) {
    return { success: false, error: "Payment transaction not found." };
  }

  if (existingPayment.status === "Reversed") {
    return { success: false, error: "Cannot edit a reversed payment." };
  }

  // 2. Check RBAC permissions (Admin or Assigned Salesperson)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const clientData: any = existingPayment.client;
  const isAssigned =
    clientData &&
    (clientData.assigned_salesperson === user.id || clientData.created_by === user.id);

  if (!isAdmin && !isAssigned) {
    return { success: false, error: "Unauthorized to modify this payment." };
  }

  // 3. Check already allocated amount: Direct editing is restricted to unallocated payments
  const allocations = existingPayment.allocations || [];
  const totalAllocated = allocations.reduce(
    (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
    0
  );

  if (totalAllocated > 0) {
    return {
      success: false,
      error: `Direct editing is restricted for allocated payments (allocated: ₹${totalAllocated.toLocaleString("en-IN")}). Please use the controlled Reversal workflow to safely revert invoice allocations first.`,
    };
  }

  // 4. Execute atomic RPC if available, fallback to direct update
  const { data: rpcData, error: rpcErr } = await supabase.rpc("edit_payment_transaction", {
    p_payment_id: params.paymentId,
    p_amount: newAmount,
    p_payment_date: params.paymentDate,
    p_payment_method: params.paymentMethod,
    p_transaction_ref: params.transactionRef?.trim() || null,
    p_notes: params.notes?.trim() || null,
  });

  if (rpcErr || (rpcData && !rpcData.success)) {
    // If RPC failed due to missing migration, execute guarded direct update
    const { error: updateErr } = await supabase
      .from("payments")
      .update({
        amount: newAmount,
        payment_date: params.paymentDate,
        payment_method: params.paymentMethod,
        transaction_ref: params.transactionRef?.trim() || null,
        notes: params.notes?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", params.paymentId);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Failed to update payment." };
    }
  }

  // 5. Record Audit Log
  const previousValues = {
    amount: existingPayment.amount,
    payment_date: existingPayment.payment_date,
    payment_method: existingPayment.payment_method,
    transaction_ref: existingPayment.transaction_ref,
    notes: existingPayment.notes,
  };

  const updatedValues = {
    amount: newAmount,
    payment_date: params.paymentDate,
    payment_method: params.paymentMethod,
    transaction_ref: params.transactionRef?.trim() || null,
    notes: params.notes?.trim() || null,
  };

  const actionType =
    Number(existingPayment.amount) !== newAmount
      ? "UPDATE"
      : "UPDATE";

  await recordAuditLog({
    actorId: user.id,
    action: actionType,
    entityType: "payment",
    entityId: params.paymentId,
    entityName: clientData?.company_name || "Payment",
    details: {
      client_id: existingPayment.client_id,
      previous_values: previousValues,
      updated_values: updatedValues,
      allocated_amount: totalAllocated,
      event: Number(existingPayment.amount) !== newAmount ? "PAYMENT_AMOUNT_CORRECTED" : "PAYMENT_UPDATED",
    },
  });

  // 6. Revalidate affected paths
  revalidatePath("/payments");
  revalidatePath(`/clients/${existingPayment.client_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { success: true };
}

/**
 * Feature 014: Reverse Payment Transaction
 * Reverts all invoice allocations, recalculates balances, and marks payment status = 'Reversed'
 * Never deletes the physical record; retains full financial audit history.
 */
export async function reversePaymentAction(params: ReversePaymentParams): Promise<PaymentActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  if (!params.paymentId) {
    return { success: false, error: "Payment ID is required." };
  }

  if (!params.reason || !params.reason.trim()) {
    return { success: false, error: "A clear reversal reason is required." };
  }

  // 1. Fetch payment
  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select(`
      id,
      client_id,
      amount,
      status,
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      ),
      allocations:invoice_payment_allocations (
        id,
        invoice_id,
        allocated_amount,
        invoice:invoices!invoice_id (
          id,
          invoice_number,
          total_amount,
          amount_paid,
          balance_due
        )
      )
    `)
    .eq("id", params.paymentId)
    .single();

  if (fetchErr || !payment) {
    return { success: false, error: "Payment transaction not found." };
  }

  if (payment.status === "Reversed") {
    return { success: false, error: "This payment has already been reversed." };
  }

  // 2. Check RBAC permissions: Restrict payment reversal strictly to authorized administrators
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const clientData: any = payment.client;

  if (!isAdmin) {
    return {
      success: false,
      error: "Permission denied: Only authorized administrators can reverse payment transactions.",
    };
  }

  // 3. Execute atomic RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc("reverse_payment_transaction", {
    p_payment_id: params.paymentId,
    p_reason: params.reason.trim(),
  });

  if (rpcErr || (rpcData && !rpcData.success)) {
    // If RPC failed, execute safe fallback transaction sequence
    const allocations = payment.allocations || [];

    // Revert each invoice allocation
    for (const alloc of allocations) {
      if (alloc.invoice) {
        const inv: any = Array.isArray(alloc.invoice) ? alloc.invoice[0] : alloc.invoice;
        if (!inv) continue;
        const newPaid = Math.max(0, (Number(inv.amount_paid) || 0) - Number(alloc.allocated_amount));
        const newBalance = Math.min(
          Number(inv.total_amount),
          Math.max(0, Number(inv.total_amount) - newPaid)
        );
        const newStatus =
          newBalance === 0 && Number(inv.total_amount) > 0
            ? "Paid"
            : newPaid > 0
            ? "Partially Paid"
            : "Unpaid";

        await supabase
          .from("invoices")
          .update({
            amount_paid: newPaid,
            balance_due: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", inv.id);
      }
    }

    // Delete invoice payment allocations
    await supabase.from("invoice_payment_allocations").delete().eq("payment_id", params.paymentId);

    // Delete installment allocations if table exists
    try {
      await supabase.from("installment_payment_allocations").delete().eq("payment_id", params.paymentId);
    } catch {
      // Table may not be active
    }

    // Mark payment as Reversed
    const { error: revErr } = await supabase
      .from("payments")
      .update({
        status: "Reversed",
        reversal_reason: params.reason.trim(),
        reversed_at: new Date().toISOString(),
        reversed_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", params.paymentId);

    if (revErr) {
      return { success: false, error: revErr.message || "Failed to reverse payment." };
    }
  }

  // 4. Record Audit Log with complete financial values, linked invoices, and audit metadata
  const linkedInvoiceIds = (payment.allocations || []).map((a: any) => a.invoice_id).filter(Boolean);
  const totalAllocatedAmount = (payment.allocations || []).reduce(
    (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
    0
  );

  await recordAuditLog({
    actorId: user.id,
    action: "VOID",
    entityType: "payment",
    entityId: params.paymentId,
    entityName: clientData?.company_name || "Payment",
    details: {
      original_payment_id: params.paymentId,
      client_id: payment.client_id,
      client_name: clientData?.company_name,
      original_payment_amount: payment.amount,
      allocated_amount: totalAllocatedAmount,
      unallocated_amount: Math.max(0, (Number(payment.amount) || 0) - totalAllocatedAmount),
      reversal_reason: params.reason.trim(),
      reversed_by: user.id,
      reversal_timestamp: new Date().toISOString(),
      linked_invoice_ids: linkedInvoiceIds,
      previous_status: payment.status,
      new_status: "Reversed",
      reversed_allocations_count: payment.allocations?.length || 0,
      event: "PAYMENT_REVERSED",
    },
  });

  // 5. Revalidate affected paths
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/clients");
  revalidatePath(`/clients/${payment.client_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { success: true };
}
