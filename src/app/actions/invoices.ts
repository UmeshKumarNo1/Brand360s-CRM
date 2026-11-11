"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface InvoiceActionState {
  error?: string | null;
  success?: boolean;
  invoiceId?: string;
  invoice?: any;
}

export interface InvoiceItemInput {
  client_service_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface CreateInvoicePayload {
  client_id: string;
  issue_date: string;
  due_date: string;
  billing_type: string;
  payment_terms: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_type: "CGST + SGST" | "IGST" | "No tax";
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  terms?: string | null;
  items: InvoiceItemInput[];
}

/**
 * Fetch all invoices with client details and computed summary stats
 */
export async function fetchInvoicesAction() {
  const supabase = await createClient();

  try {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        *,
        client:clients!client_id (
          id,
          company_name,
          client_code,
          contact_person,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          gst_number,
          pan_number,
          contract_value
        ),
        creator:profiles!created_by (full_name),
        items:invoice_items (*),
        allocations:invoice_payment_allocations (
          id,
          allocated_amount,
          created_at,
          payment:payments!payment_id (
            id,
            payment_date,
            payment_method,
            transaction_ref,
            status
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }

    const today = new Date().toISOString().split("T")[0];

    return (invoices || []).map((inv: any) => {
      const client = Array.isArray(inv.client) ? inv.client[0] : inv.client;
      const totalAmount = Number(inv.total_amount) || 0;
      const amountPaid = Number(inv.amount_paid) || 0;
      const balanceDue = Math.max(0, totalAmount - amountPaid);

      // Status calculation
      let computedStatus = inv.status;
      if (inv.status !== "Cancelled") {
        if (amountPaid >= totalAmount && totalAmount > 0) {
          computedStatus = "Paid";
        } else if (amountPaid > 0) {
          computedStatus = inv.due_date < today ? "Overdue" : "Partially Paid";
        } else if (inv.due_date < today) {
          computedStatus = "Overdue";
        } else {
          computedStatus = inv.status || "Issued";
        }
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: client?.id || inv.client_id,
        companyName: client?.company_name || "Unknown Company",
        clientCode: client?.client_code || "B360-1000",
        contactPerson: client?.contact_person || "-",
        email: client?.email || "-",
        phone: client?.phone || "-",
        address: client?.address || "-",
        city: client?.city || "-",
        state: client?.state || "-",
        gstNumber: client?.gst_number || "-",
        panNumber: client?.pan_number || "-",
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        billingType: inv.billing_type || "Full Payment",
        paymentTerms: inv.payment_terms || "Due on Receipt",
        subtotal: Number(inv.subtotal) || 0,
        discountAmount: Number(inv.discount_amount) || 0,
        taxRate: Number(inv.tax_rate) || 18,
        taxType: inv.tax_type || "CGST + SGST",
        cgstAmount: Number(inv.cgst_amount) || 0,
        sgstAmount: Number(inv.sgst_amount) || 0,
        igstAmount: Number(inv.igst_amount) || 0,
        taxAmount: Number(inv.tax_amount) || 0,
        totalAmount,
        amountPaid,
        balanceDue,
        status: computedStatus,
        notes: inv.notes,
        terms: inv.terms,
        pdfUrl: inv.pdf_url,
        emailSentTo: inv.email_sent_to,
        emailSentAt: inv.email_sent_at,
        creatorName: inv.creator?.full_name || "Admin",
        items: inv.items || [],
        allocations: inv.allocations || [],
        createdAt: inv.created_at,
      };
    });
  } catch (err: any) {
    console.error("fetchInvoicesAction failure:", err);
    return [];
  }
}

export interface InvoiceResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string | null;
}

/**
 * Fetch a single invoice with full details for preview/PDF
 */
export async function fetchInvoiceByIdAction(invoiceId: string): Promise<InvoiceResponse> {
  console.log("[fetchInvoiceByIdAction] Start fetching invoice ID/number:", invoiceId);
  try {
    const supabase = await createClient();

    // Try fetching by primary id, or fallback to invoice_number if an invoice_number was passed
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId);

    let query = supabase
      .from("invoices")
      .select(`
        *,
        client:clients!client_id (
          id,
          company_name,
          client_code,
          contact_person,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          gst_number,
          pan_number
        ),
        creator:profiles!created_by (full_name),
        items:invoice_items (*),
        allocations:invoice_payment_allocations (
          id,
          allocated_amount,
          created_at,
          payment:payments!payment_id (
            id,
            amount,
            payment_date,
            payment_method,
            transaction_ref,
            status
          )
        )
      `);

    if (isUuid) {
      query = query.eq("id", invoiceId);
    } else {
      query = query.eq("invoice_number", invoiceId);
    }

    const { data: inv, error } = await query.maybeSingle();

    console.log("[fetchInvoiceByIdAction] Supabase response:", { hasData: !!inv, error });

    if (error) {
      console.error("[fetchInvoiceByIdAction] Supabase query error:", error);
      return { success: false, error: error.message || "Failed to query invoice." };
    }

    if (!inv) {
      console.warn("[fetchInvoiceByIdAction] Invoice not found for:", invoiceId);
      return { success: false, error: `Invoice "${invoiceId}" not found.` };
    }

    const client = Array.isArray(inv.client) ? inv.client[0] : (inv.client || {});
    const formattedData = {
      ...inv,
      client: client || {},
      items: inv.items || [],
      allocations: inv.allocations || [],
    };

    console.log("[fetchInvoiceByIdAction] Successfully retrieved invoice:", formattedData.invoice_number);
    return { success: true, data: formattedData };
  } catch (err: any) {
    console.error("[fetchInvoiceByIdAction] Unexpected exception:", err);
    return { success: false, error: err.message || "An unexpected error occurred while fetching invoice." };
  }
}

/**
 * Server action to generate an atomic unique invoice number
 */
export async function generateInvoiceNumberAction(): Promise<string> {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  const prefix = `B360-INV-${currentYear}-`;

  // Count existing invoices for this year to create sequential number
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  const seq = (count || 0) + 1;
  const seqStr = String(seq).padStart(4, "0");
  return `${prefix}${seqStr}`;
}

/**
 * Create a new tax invoice with line items
 */
export async function createInvoiceAction(
  payloadOrPrevState: any,
  formData?: FormData
): Promise<InvoiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required to generate invoices." };

  let payload: CreateInvoicePayload;

  if (formData instanceof FormData) {
    const clientId = formData.get("client_id") as string;
    const description = (formData.get("description") as string) || "Professional Services";
    const subtotal = parseFloat(formData.get("subtotal") as string) || 0;
    const taxRate = parseFloat(formData.get("tax_rate") as string) || 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const issueDate = (formData.get("issue_date") as string) || new Date().toISOString().split("T")[0];
    const dueDate = formData.get("due_date") as string;
    const notes = formData.get("notes") as string;

    payload = {
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate,
      billing_type: "Full Payment",
      payment_terms: "Due on Receipt",
      subtotal,
      discount_amount: 0,
      tax_rate: taxRate,
      tax_type: "CGST + SGST",
      cgst_amount: taxAmount / 2,
      sgst_amount: taxAmount / 2,
      igst_amount: 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes,
      terms: "Payment due within terms. Brand 360s Enterprises.",
      items: [
        {
          description,
          quantity: 1,
          unit_price: subtotal,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: totalAmount,
        },
      ],
    };
  } else {
    payload = payloadOrPrevState;
  }

  if (!payload || !payload.client_id || !payload.items || payload.items.length === 0) {
    return { error: "Please select a client and add at least one billable item." };
  }

  // 1. Generate unique invoice number server-side
  const invoiceNumber = await generateInvoiceNumberAction();

  // 2. Insert invoice
  const { data: newInvoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      client_id: payload.client_id,
      issue_date: payload.issue_date,
      due_date: payload.due_date,
      billing_type: payload.billing_type,
      payment_terms: payload.payment_terms,
      subtotal: payload.subtotal,
      discount_amount: payload.discount_amount,
      tax_rate: payload.tax_rate,
      tax_type: payload.tax_type,
      cgst_amount: payload.cgst_amount,
      sgst_amount: payload.sgst_amount,
      igst_amount: payload.igst_amount,
      tax_amount: payload.tax_amount,
      total_amount: payload.total_amount,
      amount_paid: 0,
      balance_due: payload.total_amount,
      status: "Issued",
      notes: payload.notes || null,
      terms: payload.terms || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (invError || !newInvoice) {
    return { error: invError?.message || "Failed to create invoice." };
  }

  // 3. Insert line items
  const itemsToInsert = payload.items.map((it) => ({
    invoice_id: newInvoice.id,
    client_service_id: it.client_service_id || null,
    description: it.description,
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.unit_price) || 0,
    discount_amount: Number(it.discount_amount) || 0,
    tax_rate: Number(it.tax_rate) || 18,
    tax_amount: Number(it.tax_amount) || 0,
    total: Number(it.total) || 0,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemsToInsert);

  if (itemsError) {
    // Rollback invoice if item creation fails
    await supabase.from("invoices").delete().eq("id", newInvoice.id);
    return { error: itemsError.message };
  }

  revalidatePath("/invoices");
  revalidatePath(`/clients/${payload.client_id}`);
  revalidatePath("/dashboard");
  return { success: true, invoiceId: newInvoice.id };
}

/**
 * Cancel an invoice with a reason
 */
export async function cancelInvoiceAction(invoiceId: string, reason: string): Promise<InvoiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "Cancelled",
      notes: reason ? `Cancelled reason: ${reason}` : "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/invoices");
  return { success: true };
}

/**
 * Allocate a verified payment to an invoice
 */
export async function allocatePaymentToInvoiceAction(
  invoiceId: string,
  paymentId: string,
  allocatedAmount: number
): Promise<InvoiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  if (!invoiceId || !paymentId || allocatedAmount <= 0) {
    return { error: "Invalid allocation amount or payment." };
  }

  // 1. Fetch invoice and payment
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total_amount, amount_paid, client_id, due_date")
    .eq("id", invoiceId)
    .single();

  const { data: payment } = await supabase
    .from("payments")
    .select("amount, status, payment_date")
    .eq("id", paymentId)
    .single();

  if (!invoice || !payment) {
    return { error: "Invoice or payment not found." };
  }

  if (payment.status !== "Verified") {
    return { error: "Only verified payments can be allocated to invoices." };
  }

  // 2. Insert allocation record
  const { error: allocError } = await supabase
    .from("invoice_payment_allocations")
    .insert({
      invoice_id: invoiceId,
      payment_id: paymentId,
      allocated_amount: allocatedAmount,
    });

  if (allocError) {
    return { error: allocError.message };
  }

  // 3. Update invoice amount_paid & status
  const currentPaid = Number(invoice.amount_paid) || 0;
  const newAmountPaid = currentPaid + allocatedAmount;
  const totalAmount = Number(invoice.total_amount) || 0;
  const newBalance = Math.max(0, totalAmount - newAmountPaid);
  const today = new Date().toISOString().split("T")[0];

  let newStatus = "Issued";
  if (newAmountPaid >= totalAmount) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = invoice.due_date < today ? "Overdue" : "Partially Paid";
  } else if (invoice.due_date < today) {
    newStatus = "Overdue";
  }

  await supabase
    .from("invoices")
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/clients/${invoice.client_id}`);
  return { success: true };
}

/**
 * Dispatch an invoice email via Resend
 */
export async function sendInvoiceEmailAction(
  invoiceId: string,
  customRecipient?: string
): Promise<InvoiceActionState> {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      total_amount,
      due_date,
      issue_date,
      client:clients!client_id (
        company_name,
        email,
        contact_person
      )
    `)
    .eq("id", invoiceId)
    .single();

  const client = Array.isArray(invoice?.client) ? invoice.client[0] : invoice?.client;
  const recipientEmail = customRecipient || client?.email;

  if (error || !invoice || !recipientEmail) {
    return { error: "Client does not have a registered billing email address." };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey && !resendApiKey.includes("your_resend_api_key")) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "BRAND 360s Invoicing <invoices@brand360s.co>",
          to: [recipientEmail],
          subject: `Invoice ${invoice.invoice_number} | BRAND 360s`,
          html: `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #243e76; margin-top: 0;">BRAND 360s</h2>
              <p>Dear <strong>${client?.contact_person || "Valued Client"}</strong>,</p>
              <p>Please find attached your tax invoice <strong>${invoice.invoice_number}</strong> for <strong>${client?.company_name}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #f1f5f9;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Invoice Number:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Total Amount Due:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; color: #077ea1; border-bottom: 1px solid #e2e8f0;">₹${Number(invoice.total_amount).toLocaleString("en-IN")}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Payment Due Date:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${invoice.due_date}</td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #64748b;">Kindly remit payment using your allocated NEFT / RTGS or UPI channels quoting your invoice number.</p>
              <p style="margin-top: 24px; font-size: 13px;">Thank you for partnering with BRAND 360s.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        return { error: errJson.message || "Resend API error." };
      }
    } catch (err: any) {
      return { error: err.message || "Failed to dispatch email via Resend." };
    }
  }

  // Update invoice delivery status
  await supabase
    .from("invoices")
    .update({
      email_sent_to: recipientEmail,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  revalidatePath("/invoices");
  return { success: true };
}
