"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Server-side helper to get authenticated service-role client for reliable financial document access
function getServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (serviceKey && !serviceKey.includes("placeholder")) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return null;
}

export interface PaymentReceiptDetails {
  id: string;
  receiptNumber: string;
  amountReceived: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef?: string | null;
  notes?: string | null;
  generatedAt: string;
  client: {
    id: string;
    companyName: string;
    clientCode: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    gstin?: string | null;
  };
  payment: {
    id: string;
    status: string;
    recordedBy?: string | null;
  };
  installment?: {
    id: string;
    title: string;
    installmentNumber: number;
    amount: number;
    amountPaid: number;
    dueDate: string;
    status: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: string;
  } | null;
}

/**
 * Generate or retrieve a payment receipt for a given payment.
 * Safe & idempotent: will not create duplicate receipts.
 */
export async function generatePaymentReceiptAction(params: {
  paymentId: string;
  installmentId?: string;
  invoiceId?: string;
}): Promise<{
  success: boolean;
  error?: string;
  receipt?: {
    id: string;
    receiptNumber: string;
    amount?: number;
    paymentDate?: string;
  };
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  // 1. Fetch payment to verify exists and check permissions
  const { data: payment, error: pErr } = await supabase
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
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", params.paymentId)
    .single();

  if (pErr || !payment) {
    return { success: false, error: "Payment transaction not found." };
  }

  // 2. Check RBAC
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const clientData: any = Array.isArray(payment.client) ? payment.client[0] : payment.client;
  const isAssigned =
    clientData &&
    (clientData.assigned_salesperson === user.id || clientData.created_by === user.id);

  if (!isAdmin && !isAssigned) {
    return { success: false, error: "Unauthorized to generate receipts for this client." };
  }

  // 3. Check if receipt already exists
  const adminClient = getServiceRoleClient();
  const dbClient = adminClient || supabase;

  const { data: existingReceipt } = await dbClient
    .from("payment_receipts")
    .select("*")
    .eq("payment_id", params.paymentId)
    .maybeSingle();

  if (existingReceipt) {
    return {
      success: true,
      receipt: {
        id: existingReceipt.id,
        receiptNumber: existingReceipt.receipt_number,
        amount: Number(existingReceipt.amount_received),
        paymentDate: existingReceipt.payment_date,
      },
    };
  }

  // 4. Try RPC first if migration is active
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_or_get_payment_receipt", {
      p_payment_id: params.paymentId,
      p_installment_id: params.installmentId || null,
      p_invoice_id: params.invoiceId || null,
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      return {
        success: true,
        receipt: {
          id: rpcRes.receipt_id,
          receiptNumber: rpcRes.receipt_number,
        },
      };
    }
  } catch (rpcCatch) {
    console.warn("RPC create_or_get_payment_receipt unavailable, falling back to direct insert:", rpcCatch);
  }

  // 5. Fallback sequential receipt number generation
  const year = new Date().getFullYear();
  const { count } = await dbClient
    .from("payment_receipts")
    .select("id", { count: "exact", head: true });

  const nextNum = (count || 0) + 1;
  const receiptNumber = `REC-${year}-${String(nextNum).padStart(4, "0")}`;

  // Find linked invoice if not provided
  let invoiceId = params.invoiceId;
  if (!invoiceId) {
    const { data: alloc } = await dbClient
      .from("invoice_payment_allocations")
      .select("invoice_id")
      .eq("payment_id", params.paymentId)
      .limit(1)
      .maybeSingle();
    if (alloc) invoiceId = alloc.invoice_id;
  }

  // Find linked installment if not provided
  let installmentId = params.installmentId;
  if (!installmentId) {
    const { data: instAlloc } = await dbClient
      .from("installment_payment_allocations")
      .select("installment_id")
      .eq("payment_id", params.paymentId)
      .limit(1)
      .maybeSingle();
    if (instAlloc) installmentId = instAlloc.installment_id;
  }

  const { data: newReceipt, error: insErr } = await dbClient
    .from("payment_receipts")
    .insert({
      receipt_number: receiptNumber,
      payment_id: params.paymentId,
      client_id: payment.client_id,
      installment_id: installmentId || null,
      invoice_id: invoiceId || null,
      amount_received: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      transaction_reference: payment.transaction_ref || null,
      notes: payment.notes || null,
      generated_at: new Date().toISOString(),
      generated_by: user.id,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("Error creating payment receipt fallback:", insErr);
    return { success: false, error: insErr.message || "Failed to generate payment receipt." };
  }

  revalidatePath("/payments");
  return {
    success: true,
    receipt: {
      id: newReceipt.id,
      receiptNumber: newReceipt.receipt_number,
      amount: Number(newReceipt.amount_received),
      paymentDate: newReceipt.payment_date,
    },
  };
}

/**
 * Fetch complete receipt data for previewing and PDF rendering
 */
export async function fetchPaymentReceiptDetailsAction(receiptIdOrPaymentId: string): Promise<{
  success: boolean;
  error?: string;
  receipt?: PaymentReceiptDetails;
}> {
  if (!receiptIdOrPaymentId) {
    return { success: false, error: "Payment or receipt identifier is required." };
  }

  const supabase = await createClient();
  const adminClient = getServiceRoleClient();
  const dbClient = adminClient || supabase;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receiptIdOrPaymentId);

  const receiptSelectQuery = `
    id,
    receipt_number,
    amount_received,
    payment_date,
    payment_method,
    transaction_reference,
    pdf_storage_path,
    notes,
    generated_at,
    payment:payments!payment_id (
      id,
      amount,
      payment_date,
      payment_method,
      transaction_ref,
      status,
      notes,
      recorder:profiles!recorded_by (full_name)
    ),
    client:clients!client_id (
      id,
      company_name,
      client_code,
      contact_person,
      email,
      phone,
      billing_address,
      gst_number,
      pan_number,
      assigned_salesperson,
      created_by
    ),
    installment:payment_schedules!installment_id (
      id,
      title,
      installment_number,
      amount,
      amount_paid,
      due_date,
      status
    ),
    invoice:invoices!invoice_id (
      id,
      invoice_number,
      total_amount,
      amount_paid,
      balance_due,
      status
    )
  `;

  let result;
  if (isUuid) {
    result = await dbClient
      .from("payment_receipts")
      .select(receiptSelectQuery)
      .or(`id.eq.${receiptIdOrPaymentId},payment_id.eq.${receiptIdOrPaymentId}`)
      .maybeSingle();
  } else {
    result = await dbClient
      .from("payment_receipts")
      .select(receiptSelectQuery)
      .eq("receipt_number", receiptIdOrPaymentId)
      .maybeSingle();
  }

  // If receipt record does not exist yet, attempt automatic generation if identifier is a UUID
  if (result.error || !result.data) {
    if (isUuid) {
      const genRes = await generatePaymentReceiptAction({ paymentId: receiptIdOrPaymentId });
      if (genRes.success && genRes.receipt?.id) {
        // Query again using the newly generated receipt ID
        const secondAttempt = await dbClient
          .from("payment_receipts")
          .select(receiptSelectQuery)
          .eq("id", genRes.receipt.id)
          .maybeSingle();

        if (secondAttempt.data) {
          result = secondAttempt;
        }
      }
    }
  }

  if (result.error || !result.data) {
    console.error("fetchPaymentReceiptDetailsAction lookup failed:", result.error || "No data");
    return { success: false, error: result.error?.message || "Payment receipt not found." };
  }

  const r = result.data;
  const client: any = Array.isArray(r.client) ? r.client[0] : r.client;
  const payment: any = Array.isArray(r.payment) ? r.payment[0] : r.payment;
  const installment: any = Array.isArray(r.installment) ? r.installment[0] : r.installment;
  const invoice: any = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice;

  return {
    success: true,
    receipt: {
      id: r.id,
      receiptNumber: r.receipt_number,
      amountReceived: Number(r.amount_received),
      paymentDate: r.payment_date,
      paymentMethod: r.payment_method,
      transactionRef: r.transaction_reference,
      notes: r.notes,
      generatedAt: r.generated_at,
      client: {
        id: client?.id,
        companyName: client?.company_name || "Unknown Company",
        clientCode: client?.client_code || "B360-1000",
        contactPerson: client?.contact_person,
        email: client?.email,
        phone: client?.phone,
        address: client?.billing_address,
        gstin: client?.gst_number || client?.gstin,
      },
      payment: {
        id: payment?.id,
        status: payment?.status || "Verified",
        recordedBy: payment?.recorder?.full_name || "System",
      },
      installment: installment
        ? {
            id: installment.id,
            title: installment.title,
            installmentNumber: installment.installment_number,
            amount: Number(installment.amount),
            amountPaid: Number(installment.amount_paid),
            dueDate: installment.due_date,
            status: installment.status,
          }
        : null,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            totalAmount: Number(invoice.total_amount),
            amountPaid: Number(invoice.amount_paid),
            balanceDue: Number(invoice.balance_due),
            status: invoice.status,
          }
        : null,
    },
  };
}

/**
 * Dispatch a Payment Receipt Email to the client via Resend
 */
export async function sendReceiptEmailAction(
  receiptId: string,
  customRecipient?: string
): Promise<{ success: boolean; error?: string }> {
  const receiptRes = await fetchPaymentReceiptDetailsAction(receiptId);
  if (!receiptRes.success || !receiptRes.receipt) {
    return { success: false, error: receiptRes.error || "Receipt not found." };
  }

  const receipt = receiptRes.receipt;
  const recipientEmail = customRecipient || receipt.client?.email;

  if (!recipientEmail) {
    return { success: false, error: "Client does not have a registered email address." };
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
          from: "BRAND 360s Receipts <invoices@brand360s.co>",
          to: [recipientEmail],
          subject: `Payment Receipt ${receipt.receiptNumber} | BRAND 360s`,
          html: `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #243e76; margin-top: 0;">BRAND 360s</h2>
              <p>Dear <strong>${receipt.client?.contactPerson || receipt.client?.companyName}</strong>,</p>
              <p>Thank you for your payment. Here is your official payment acknowledgement receipt <strong>${receipt.receiptNumber}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #f1f5f9;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Receipt Number:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${receipt.receiptNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Amount Received:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; color: #0481A2; border-bottom: 1px solid #e2e8f0;">₹${Number(receipt.amountReceived).toLocaleString("en-IN")}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Payment Date:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${receipt.paymentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Payment Method:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${receipt.paymentMethod}</td>
                </tr>
                ${receipt.transactionRef ? `
                <tr style="background: #f8fafc;">
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Reference / UTR:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${receipt.transactionRef}</td>
                </tr>
                ` : ""}
                ${receipt.invoice?.invoiceNumber ? `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Linked Invoice:</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${receipt.invoice.invoiceNumber}</td>
                </tr>
                ` : ""}
              </table>
              <p style="font-size: 13px; color: #64748b;">This is a computer-generated digital payment receipt issued by BRAND 360S PRIVATE LIMITED.</p>
              <p style="margin-top: 24px; font-size: 13px;">Thank you for partnering with BRAND 360s.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        return { success: false, error: errJson.message || "Resend API error." };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to dispatch receipt email via Resend." };
    }
  }

  return { success: true };
}

