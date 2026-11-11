"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PaymentActionState {
  error?: string | null;
  success?: boolean;
}

export async function fetchPaymentsAction() {
  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      id,
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
        balance_receivable
      ),
      recorder:profiles!recorded_by (
        full_name,
        email
      )
    `)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  return (payments || []).map((p: any) => ({
    id: p.id,
    clientId: p.client?.id,
    companyName: p.client?.company_name || "Unknown Company",
    clientCode: p.client?.client_code || "B360-1000",
    amount: Number(p.amount) || 0,
    paymentDate: p.payment_date,
    paymentMethod: p.payment_method,
    transactionRef: p.transaction_ref || "-",
    status: p.status,
    recordedBy: p.recorder?.full_name || "System",
    notes: p.notes,
  }));
}

export async function fetchAllInstallmentsAction() {
  const supabase = await createClient();

  const { data: schedules, error } = await supabase
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

  if (error) {
    console.error("Error fetching installments:", error);
    return [];
  }

  return (schedules || []).map((s: any) => {
    const amount = Number(s.amount) || 0;
    const amountPaid = Number(s.amount_paid) || 0;
    const remaining = Math.max(0, amount - amountPaid);
    const today = new Date().toISOString().split("T")[0];
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
      id: s.id,
      clientId: s.client?.id || s.client_id,
      companyName: s.client?.company_name || "Unknown Company",
      clientCode: s.client?.client_code || "B360-1000",
      title: s.title || `Milestone ${s.installment_number || 1}`,
      installmentNumber: s.installment_number || 1,
      amount,
      amountPaid,
      remaining,
      dueDate: s.due_date,
      status: computedStatus,
      paidDate: s.paid_date,
      notes: s.notes,
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
  const { error: paymentError } = await supabase
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
    });

  if (paymentError) {
    return { error: paymentError.message };
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
  const initialStatus = dueDate < today ? "Overdue" : "Pending";

  const { error } = await supabase
    .from("payment_schedules")
    .insert({
      client_id: clientId,
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
    .select("amount_paid")
    .eq("id", installmentId)
    .single();

  const amountPaid = Number(current?.amount_paid) || 0;
  const today = new Date().toISOString().split("T")[0];

  let newStatus = "Pending";
  if (amountPaid >= amount) {
    newStatus = "Paid in full";
  } else if (amountPaid > 0) {
    newStatus = dueDate < today ? "Overdue" : "Partially Paid";
  } else if (dueDate < today) {
    newStatus = "Overdue";
  }

  const { error } = await supabase
    .from("payment_schedules")
    .update({
      title,
      amount,
      due_date: dueDate,
      status: newStatus,
      notes,
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

export async function fetchClientFinancialsAction(clientId: string) {
  const supabase = await createClient();

  // Fetch payments
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
      recorder:profiles!recorded_by (full_name)
    `)
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false });

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
    payments: payments || [],
    schedules: enrichedSchedules,
  };
}
