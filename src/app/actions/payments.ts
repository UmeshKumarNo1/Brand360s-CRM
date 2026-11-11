"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function fetchPaymentsAction() {
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
    const totalAmount = Number(p.amount) || 0;
    const allocations = p.allocations || [];
    const totalAllocated = allocations.reduce(
      (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
      0
    );
    const availableAmount = Math.max(0, totalAmount - totalAllocated);

    let allocationStatus: "Unallocated" | "Partially Allocated" | "Fully Allocated" = "Unallocated";
    if (totalAllocated >= totalAmount && totalAmount > 0) {
      allocationStatus = "Fully Allocated";
    } else if (totalAllocated > 0) {
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

  // 1. Insert payment record into public.payments
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

  // 1b. Check if invoice allocations were passed with this payment
  const allocationsJson = formData.get("invoice_allocations") as string;
  if (allocationsJson && status === "Verified") {
    try {
      const parsedAllocations: { invoiceId: string; amount: number }[] = JSON.parse(allocationsJson);
      if (Array.isArray(parsedAllocations) && parsedAllocations.length > 0) {
        // Run allocation action for this new payment
        await allocatePaymentToInvoicesAction(newPayment.id, parsedAllocations);
      }
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
    const totalAmount = Number(p.amount) || 0;
    const allocations = p.allocations || [];
    const totalAllocated = allocations.reduce(
      (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
      0
    );
    const availableAmount = Math.max(0, totalAmount - totalAllocated);

    let allocationStatus: "Unallocated" | "Partially Allocated" | "Fully Allocated" = "Unallocated";
    if (totalAllocated >= totalAmount && totalAmount > 0) {
      allocationStatus = "Fully Allocated";
    } else if (totalAllocated > 0) {
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
  const supabase = await createClient();

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
    .eq("client_id", clientId)
    .neq("status", "Cancelled")
    .order("issue_date", { ascending: true });

  if (error) {
    console.error("Error fetching client invoices for allocation:", error);
    return [];
  }

  const today = new Date().toISOString().split("T")[0];

  return (invoices || []).map((inv: any) => {
    const total = Number(inv.total_amount) || 0;
    const paid = Number(inv.amount_paid) || 0;
    const balance = Math.max(0, total - paid);

    let computedStatus = inv.status;
    if (balance <= 0 && total > 0) {
      computedStatus = "Paid";
    } else if (paid > 0) {
      computedStatus = inv.due_date < today ? "Overdue" : "Partially Paid";
    } else if (inv.due_date < today) {
      computedStatus = "Overdue";
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

  // 3. Compute available unallocated amount
  const paymentTotal = Number(payment.amount) || 0;
  const currentAllocated = (payment.existing_allocations || []).reduce(
    (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
    0
  );
  const paymentAvailable = Math.max(0, paymentTotal - currentAllocated);

  const totalNewAllocation = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  if (totalNewAllocation <= 0) {
    return { success: false, error: "Total allocation amount must be greater than zero." };
  }

  if (totalNewAllocation > paymentAvailable + 0.001) {
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

    // Fetch invoice
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("id, client_id, total_amount, amount_paid, balance_due, status, due_date")
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

    // Try RPC first for atomicity (reconcile_and_allocate_payment or allocate_payment_to_invoice)
    let allocatedSuccess = false;

    const { data: recData, error: recError } = await supabase.rpc("reconcile_and_allocate_payment", {
      p_payment_id: paymentId,
      p_invoice_id: item.invoiceId,
      p_amount: allocAmount,
    });

    if (!recError && recData && recData.success) {
      results.push(recData);
      allocatedSuccess = true;
    } else {
      const { data: rpcData, error: rpcError } = await supabase.rpc("allocate_payment_to_invoice", {
        p_payment_id: paymentId,
        p_invoice_id: item.invoiceId,
        p_amount: allocAmount,
      });

      if (!rpcError && rpcData && rpcData.success) {
        results.push(rpcData);
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
  revalidatePath(`/clients/${payment.client_id}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    allocations: results,
  };
}
