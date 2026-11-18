"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";
import { generateInvoiceNumberAction } from "@/lib/invoices/invoice-number";

/**
 * FEATURE 015: Generate an official Tax Invoice directly from an Installment Milestone
 * Automatically populates milestone details, tax calculation, and links the invoice to the installment.
 */
export async function generateInvoiceFromInstallmentAction(params: {
  installmentId: string;
  description?: string;
  amount?: number;
  taxRate?: number;
}): Promise<{
  success: boolean;
  error?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required to generate invoices." };

  // 1. Fetch installment with client details
  const { data: installment, error: instErr } = await supabase
    .from("payment_schedules")
    .select(`
      id,
      client_id,
      invoice_id,
      title,
      installment_number,
      amount,
      due_date,
      status,
      notes,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        state,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", params.installmentId)
    .single();

  if (instErr || !installment) {
    return { success: false, error: "Installment schedule not found." };
  }

  // 2. Check RBAC
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const client: any = Array.isArray(installment.client) ? installment.client[0] : installment.client;
  const isAssigned =
    client &&
    (client.assigned_salesperson === user.id || client.created_by === user.id);

  if (!isAdmin && !isAssigned) {
    return { success: false, error: "Unauthorized to generate invoice for this client." };
  }

  // 3. Prevent duplicate invoice generation if an active invoice is already linked
  if (installment.invoice_id) {
    const { data: existingInv } = await supabase
      .from("invoices")
      .select("id, invoice_number, status")
      .eq("id", installment.invoice_id)
      .single();

    if (existingInv && existingInv.status !== "Cancelled") {
      return {
        success: false,
        error: `An active invoice (${existingInv.invoice_number}) is already linked to this installment.`,
      };
    }
  }

  // 4. Financial amounts & tax calculation
  const totalAmount = params.amount && params.amount > 0 ? params.amount : Number(installment.amount);
  if (isNaN(totalAmount) || totalAmount <= 0) {
    return { success: false, error: "Installment amount must be greater than zero." };
  }

  const taxRate = params.taxRate !== undefined ? Number(params.taxRate) : 18;
  const clientState = String(client?.state || "").trim().toLowerCase();
  const isTamilNadu = clientState.includes("tamil nadu") || clientState.includes("tn");
  const taxType: "CGST + SGST" | "IGST" | "No tax" =
    taxRate === 0 ? "No tax" : isTamilNadu ? "CGST + SGST" : "IGST";

  const subtotal = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
  const taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;

  const cgstAmount = taxType === "CGST + SGST" ? Math.round((taxAmount / 2) * 100) / 100 : 0;
  const sgstAmount = taxType === "CGST + SGST" ? Math.round((taxAmount / 2) * 100) / 100 : 0;
  const igstAmount = taxType === "IGST" ? taxAmount : 0;

  // 5. Generate sequential unique invoice number atomically
  const invoiceNumber = await generateInvoiceNumberAction();

  const todayStr = new Date().toISOString().split("T")[0];
  const dueDate = installment.due_date || todayStr;
  const description =
    params.description?.trim() ||
    `${installment.title || `Milestone ${installment.installment_number || 1}`} — Scheduled Contract Payment`;

  // 6. Insert new Invoice
  const { data: newInvoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      client_id: installment.client_id,
      issue_date: todayStr,
      due_date: dueDate,
      billing_type: "Milestone / Installment",
      payment_terms: "Due on Receipt",
      subtotal,
      discount_amount: 0,
      tax_rate: taxRate,
      tax_type: taxType,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      status: "Issued",
      notes: `Generated for Installment: ${installment.title || `Milestone #${installment.installment_number}`}`,
      terms: "Payment due within milestone terms. Brand 360s Enterprises.",
      created_by: user.id,
    })
    .select("id, invoice_number")
    .single();

  if (invError || !newInvoice) {
    console.error("Error creating installment invoice:", invError);
    return { success: false, error: invError?.message || "Failed to create tax invoice." };
  }

  // 7. Insert Line Item
  const { error: itemError } = await supabase.from("invoice_items").insert({
    invoice_id: newInvoice.id,
    description,
    quantity: 1,
    unit_price: subtotal,
    discount_amount: 0,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total: totalAmount,
  });

  if (itemError) {
    console.error("Error creating line item for installment invoice:", itemError);
  }

  // 8. Link newly created invoice to the installment schedule
  const { error: linkError } = await supabase
    .from("payment_schedules")
    .update({
      invoice_id: newInvoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.installmentId);

  if (linkError) {
    console.warn("Could not automatically update installment invoice_id:", linkError);
  }

  // 9. Record Audit Log
  await recordAuditLog({
    actorId: user.id,
    action: "CREATE",
    entityType: "invoice",
    entityId: newInvoice.id,
    entityName: `Invoice ${newInvoice.invoice_number}`,
    details: {
      client_id: installment.client_id,
      installment_id: installment.id,
      installment_title: installment.title,
      invoice_number: newInvoice.invoice_number,
      total_amount: totalAmount,
      event: "INSTALLMENT_INVOICE_GENERATED",
    },
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/clients/${installment.client_id}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    invoiceId: newInvoice.id,
    invoiceNumber: newInvoice.invoice_number,
  };
}

/**
 * Link an existing invoice to an installment schedule
 */
export async function linkInvoiceToInstallmentAction(params: {
  installmentId: string;
  invoiceId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const { data: installment, error: instErr } = await supabase
    .from("payment_schedules")
    .select("id, client_id, invoice_id, title")
    .eq("id", params.installmentId)
    .single();

  if (instErr || !installment) {
    return { success: false, error: "Installment schedule not found." };
  }

  if (params.invoiceId) {
    // Verify invoice belongs to the same client
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("id, client_id, invoice_number, status")
      .eq("id", params.invoiceId)
      .single();

    if (invErr || !inv) {
      return { success: false, error: "Selected invoice not found." };
    }

    if (inv.client_id !== installment.client_id) {
      return { success: false, error: "Cannot link invoice from a different client." };
    }

    if (inv.status === "Cancelled") {
      return { success: false, error: "Cannot link a cancelled invoice." };
    }
  }

  const { error: updateErr } = await supabase
    .from("payment_schedules")
    .update({
      invoice_id: params.invoiceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.installmentId);

  if (updateErr) {
    return { success: false, error: updateErr.message || "Failed to link invoice." };
  }

  await recordAuditLog({
    actorId: user.id,
    action: "UPDATE",
    entityType: "installment",
    entityId: installment.id,
    entityName: installment.title || "Installment",
    details: {
      client_id: installment.client_id,
      linked_invoice_id: params.invoiceId,
      previous_invoice_id: installment.invoice_id,
      event: "INSTALLMENT_INVOICE_LINKED",
    },
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/clients/${installment.client_id}`);

  return { success: true };
}

