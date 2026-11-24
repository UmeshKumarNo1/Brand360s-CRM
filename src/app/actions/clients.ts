"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
import { COUNTRY_NAME_TO_CODE } from "@/lib/data/countries";
import { checkClientDuplicatesAction } from "./duplicate-detection";
import { DuplicateMatch } from "@/lib/validation/duplicate-detector";
import { autoGenerateInvoiceForClientAction } from "@/app/actions/invoices";
import {
  validateGstin,
  validatePan,
  validatePincode,
  validateEmailFormat,
} from "@/lib/validation/client-validation";

import { recordAuditLog } from "@/lib/audit/audit-logger";
import { calculateClientFinancials, calculateServiceFinancials } from "@/lib/financial/financial-calculator";

export interface CreateClientState {
  error?: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  clientId?: string;
  hasDuplicates?: boolean;
  duplicateMatches?: DuplicateMatch[];
  isBlockedByActiveEmail?: boolean;
}

export async function createClientAction(
  prevState: CreateClientState | null,
  formData: FormData
): Promise<CreateClientState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to create a client.", success: false };
  }

  // Get current user's profile to verify role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  // Section 1: Company Details
  const company_name = (formData.get("company_name") as string)?.trim();
  const trade_name = (formData.get("trade_name") as string)?.trim() || null;
  const company_type = (formData.get("company_type") as string) || "Private Limited (Pvt Ltd)";
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || "India";

  // Section 2: Primary Contact
  const contact_person = (formData.get("contact_person") as string)?.trim();
  const designation = (formData.get("designation") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim();
  const alternate_phone = (formData.get("alternate_phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;

  // Section 3: Additional Contacts (JSON stringified)
  let additional_contacts: any[] = [];
  try {
    const rawContacts = formData.get("additional_contacts") as string;
    if (rawContacts) {
      additional_contacts = JSON.parse(rawContacts);
    }
  } catch (err) {
    console.error("Error parsing additional contacts:", err);
  }

  // Section 4: Billing Details & GST
  const billing_name = (formData.get("billing_name") as string)?.trim() || null;
  const billing_address = (formData.get("billing_address") as string)?.trim() || null;
  const billing_contact = (formData.get("billing_contact") as string)?.trim() || null;
  const billing_email = (formData.get("billing_email") as string)?.trim() || null;
  const is_not_gst_registered = formData.get("is_not_gst_registered") === "true";
  const raw_gst_number = (formData.get("gstin") as string || formData.get("gst_number") as string)?.trim().toUpperCase() || null;
  const gst_number = is_not_gst_registered ? "Not GST-registered" : raw_gst_number;
  const pan_number = (formData.get("pan_number") as string)?.trim().toUpperCase() || null;

  // Section 5: Client Ownership
  let assigned_salesperson = user.id;
  if (isAdmin) {
    const selectedSalesperson = (formData.get("salesperson_id") as string || formData.get("assigned_salesperson") as string)?.trim();
    if (selectedSalesperson) {
      assigned_salesperson = selectedSalesperson;
    }
  }
  const client_since = (formData.get("client_since") as string) || new Date().toISOString().split("T")[0];

  // Section 6: Client Status
  const client_status = (formData.get("client_status") as string) || "Active";

  // Section 7: Notes
  const notes = (formData.get("notes") as string)?.trim() || null;

  // Commercials are derived strictly from active services
  const services_purchased = (formData.get("services_purchased") as string)?.trim() || null;
  // Creating a new client without services always results in Contract Value = ₹0
  const contract_value = 0.00;
  const payments_received = 0.00;
  const balance_receivable = 0.00;

  // Field validation
  const fieldErrors: Record<string, string> = {};

  if (!company_name) {
    fieldErrors.company_name = "Company Legal Name is required.";
  }
  if (!contact_person) {
    fieldErrors.contact_person = "Primary Contact Full Name is required.";
  }
  if (!phone) {
    fieldErrors.phone = "Primary Mobile Number is required.";
  } else {
    try {
      const defaultCountry = COUNTRY_NAME_TO_CODE[country] || "IN";
      const parsed = parseInitialPhone(phone, defaultCountry);
      const phoneCheck = validatePhoneNumber(parsed.nationalNumber, parsed.country, true);
      if (!phoneCheck.isValid) {
        fieldErrors.phone = phoneCheck.error || "Invalid phone number.";
      }
    } catch { }
  }

  if (email) {
    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.isValid) {
      fieldErrors.email = emailCheck.error || "Please enter a valid email address.";
    }
  }

  if (pincode) {
    const pinCheck = validatePincode(pincode);
    if (!pinCheck.isValid) {
      fieldErrors.pincode = pinCheck.error || "PIN Code must be a 6-digit number.";
    }
  }

  if (!is_not_gst_registered && raw_gst_number) {
    const gstCheck = validateGstin(raw_gst_number);
    if (!gstCheck.isValid) {
      fieldErrors.gstin = gstCheck.error || "Invalid GSTIN format.";
    }
  }

  if (pan_number) {
    const panCheck = validatePan(pan_number);
    if (!panCheck.isValid) {
      fieldErrors.pan_number = panCheck.error || "Invalid PAN format.";
    }
  }

  if (billing_email) {
    const billingEmailCheck = validateEmailFormat(billing_email);
    if (!billingEmailCheck.isValid) {
      fieldErrors.billing_email = billingEmailCheck.error || "Invalid billing email address.";
    }
  }

  if (alternate_phone) {
    try {
      const defaultCountry = COUNTRY_NAME_TO_CODE[country] || "IN";
      const parsedAlt = parseInitialPhone(alternate_phone, defaultCountry);
      const altCheck = validatePhoneNumber(parsedAlt.nationalNumber, parsedAlt.country, false);
      if (!altCheck.isValid) {
        fieldErrors.alternate_phone = altCheck.error || "Invalid alternate phone number.";
      }
    } catch { }
  }

  if (isNaN(contract_value) || contract_value < 0) {
    fieldErrors.contract_value = "Contract value cannot be negative.";
  }
  if (isNaN(payments_received) || payments_received < 0) {
    fieldErrors.payments_received = "Payments received cannot be negative.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstErrorMessage = Object.values(fieldErrors)[0];
    return {
      error: firstErrorMessage,
      fieldErrors,
      success: false,
    };
  }

  // Feature 015: Duplicate Detection Check
  const allowDuplicateOverride = formData.get("allow_duplicate_override") === "true";
  const duplicateCheck = await checkClientDuplicatesAction({
    companyName: company_name,
    tradeName: trade_name,
    email,
    phone,
  });

  // Strict prevention: Duplicate email on an active client is NEVER permitted
  if (duplicateCheck.activeEmailMatch) {
    return {
      error: `A client with email "${email}" is already active in BRAND 360s CRM. Duplicate active client records with identical email are prevented.`,
      fieldErrors: {
        email: "This email address is already registered to an active client.",
      },
      hasDuplicates: true,
      duplicateMatches: duplicateCheck.matches,
      isBlockedByActiveEmail: true,
      success: false,
    };
  }

  // Non-blocking duplicate warning (Company name, phone, or archived email)
  if (duplicateCheck.hasMatches && !allowDuplicateOverride) {
    return {
      error: "Potential duplicate client detected matching company name, phone, or existing records. Please review.",
      hasDuplicates: true,
      duplicateMatches: duplicateCheck.matches,
      isBlockedByActiveEmail: false,
      success: false,
    };
  }
  // Determine Payment Status
  let payment_status: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
  if (contract_value > 0 && balance_receivable === 0) {
    payment_status = "Paid in full";
  } else if (payments_received > 0) {
    payment_status = "Partially Paid";
  }

  // Primary payload with all enhanced fields
  const primaryPayload: Record<string, any> = {
    company_name,
    trade_name,
    company_type,
    contact_person,
    designation,
    email: email || null,
    phone,
    alternate_phone,
    address,
    city,
    state,
    pincode,
    country,
    gst_number,
    pan_number,
    is_not_gst_registered,
    billing_name,
    billing_address,
    billing_contact,
    billing_email,
    additional_contacts,
    client_since,
    client_status,
    services_purchased,
    contract_value,
    payments_received,
    balance_receivable,
    next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
    payment_status,
    assigned_salesperson,
    created_by: user.id,
    notes,
  };

  let { data, error } = await supabase
    .from("clients")
    .insert(primaryPayload)
    .select("id")
    .single();

  // Resilient fallback if remote database hasn't executed migration 010 yet
  if (error) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("column") ||
      errorMsg.includes("check constraint") ||
      errorMsg.includes("violates check constraint")
    ) {
      console.warn("Retrying with fallback payload due to DB schema constraints:", errorMsg);

      const metadataSummary = [
        trade_name ? `Trade Name: ${trade_name}` : null,
        designation ? `Designation: ${designation}` : null,
        billing_name ? `Billing Name: ${billing_name}` : null,
        billing_address ? `Billing Address: ${billing_address}` : null,
        billing_contact ? `Billing Contact: ${billing_contact}` : null,
        billing_email ? `Billing Email: ${billing_email}` : null,
        client_since ? `Client Since: ${client_since}` : null,
        additional_contacts.length > 0 ? `Additional Contacts: ${JSON.stringify(additional_contacts)}` : null,
      ].filter(Boolean).join("\n");

      const combinedNotes = [notes, metadataSummary].filter(Boolean).join("\n\n");

      const fallbackPayload: Record<string, any> = {
        company_name,
        company_type,
        contact_person,
        email: email || null,
        phone,
        alternate_phone,
        address,
        city,
        state,
        pincode,
        country,
        gst_number: is_not_gst_registered ? "Not GST-registered" : gst_number,
        pan_number,
        services_purchased,
        contract_value,
        payments_received,
        balance_receivable,
        next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
        payment_status,
        client_status: client_status === "Inactive" ? "On Hold" : "Active",
        assigned_salesperson,
        created_by: user.id,
        notes: combinedNotes || null,
      };

      const fallbackResult = await supabase
        .from("clients")
        .insert(fallbackPayload)
        .select("id")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }
  }

  if (error) {
    return { error: error.message, success: false };
  }

  // Feature: Automatic Invoice Creation upon Client Engagement
  // Generate initial invoice when contract value > 0
  if (contract_value > 0 && data?.id) {
    try {
      await autoGenerateInvoiceForClientAction(data.id, {
        amount: contract_value,
        description:
          services_purchased ||
          "Professional Legal, Compliance & Registration Services",
      });
    } catch (autoInvErr) {
      console.warn(
        "Auto-invoice generation warning on client creation:",
        autoInvErr
      );
    }
  }

  // Record client creation in audit history
  if (data?.id) {
    await recordAuditLog({
      action: "CREATE",
      entityType: "client",
      entityId: data.id,
      entityName: company_name,
      details: {
        trade_name,
        assigned_salesperson,
        client_status,
        contract_value,
        duplicate_override: allowDuplicateOverride,
      },
    });
  }

  revalidatePath("/clients");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");

  return { success: true, clientId: data.id };
}

export async function fetchClientsAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        assigned_profile:profiles!assigned_salesperson(full_name, email),
        services:client_services(
          id,
          service_name,
          service_category,
          service_fee,
          govt_fee,
          total_amount,
          tax_rate,
          tax_amount,
          assigned_employee_id,
          start_date,
          expected_completion_date,
          service_status,
          fulfillment_stages,
          current_stage_name,
          current_stage_description,
          progress_percentage,
          assigned_profile:profiles!assigned_employee_id(full_name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Error fetching clients with services, falling back to basic query:",
        error
      );

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("clients")
        .select(`
          *,
          assigned_profile:profiles!assigned_salesperson(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        console.error("Fallback client query failed:", fallbackError);
        return [];
      }

      return fallbackData || [];
    }

    // Extract all client IDs and service IDs to fetch invoices, payments and allocations in batch
    const allClientIds = (data || []).map((c: any) => c.id);
    const allServiceIds: string[] = [];

    (data || []).forEach((c: any) => {
      (c.services || []).forEach((s: any) => {
        if (s.id) allServiceIds.push(s.id);
      });
    });

    // Batch fetch issued invoices, payments, and allocations
    const [invoicesRes, paymentsRes, allocsRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, client_id, subtotal, tax_amount, total_amount, amount_paid, balance_due, status, items:invoice_items(id, unit_price, quantity, tax_amount, total, client_service_id)")
        .in("client_id", allClientIds)
        .not("status", "in", '("Draft","Void","Cancelled")'),
      supabase
        .from("payments")
        .select("id, client_id, amount, status")
        .in("client_id", allClientIds),
      allServiceIds.length > 0 || allClientIds.length > 0
        ? supabase
            .from("invoice_payment_allocations")
            .select("id, invoice_id, payment_id, allocated_amount, client_service_id")
        : Promise.resolve({ data: [] }),
    ]);

    const invoicesByClient: Record<string, any[]> = {};
    (invoicesRes.data || []).forEach((inv: any) => {
      if (!invoicesByClient[inv.client_id]) invoicesByClient[inv.client_id] = [];
      invoicesByClient[inv.client_id].push(inv);
    });

    const paymentsByClient: Record<string, any[]> = {};
    (paymentsRes.data || []).forEach((pmt: any) => {
      if (!paymentsByClient[pmt.client_id]) paymentsByClient[pmt.client_id] = [];
      paymentsByClient[pmt.client_id].push(pmt);
    });

    const allocations = allocsRes.data || [];

    // Enrich each client and their services with standardized financial calculations
    return (data || []).map((client: any) => {
      const clientInvs = invoicesByClient[client.id] || [];
      const clientPmts = paymentsByClient[client.id] || [];
      const clientInvIds = new Set(clientInvs.map((i: any) => i.id));
      const clientAllocs = allocations.filter((a: any) => clientInvIds.has(a.invoice_id));

      const clientFinancials = calculateClientFinancials({
        clientId: client.id,
        services: client.services || [],
        invoices: clientInvs,
        payments: clientPmts,
        allocations: clientAllocs,
        nextDueDate: client.next_payment_due_date,
      });

      const enrichedServices = (client.services || []).map((s: any) => {
        // Find matching invoices for this service
        const matchingInvoices = clientInvs.filter((inv: any) => {
          if (inv.items && inv.items.some((it: any) => it.client_service_id === s.id)) return true;
          if ((client.services || []).length === 1 && !inv.items?.some((it: any) => it.client_service_id && it.client_service_id !== s.id)) return true;
          return false;
        });

        // Find service allocations
        const matchingInvIds = new Set(matchingInvoices.map((i: any) => i.id));
        let serviceAllocatedAmount = clientAllocs
          .filter((a: any) => a.client_service_id === s.id || matchingInvIds.has(a.invoice_id))
          .reduce((sum: number, a: any) => sum + (Number(a.allocated_amount ?? a.amount) || 0), 0);

        // Fallback for single service with invoice paid amount
        if ((client.services || []).length === 1 && serviceAllocatedAmount === 0) {
          const invPaid = matchingInvoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0);
          if (invPaid > 0) {
            serviceAllocatedAmount = invPaid;
          } else {
            serviceAllocatedAmount = clientFinancials.collectedAmount;
          }
        }

        const svcFiancials = calculateServiceFinancials({
          service: s,
          serviceInvoices: matchingInvoices,
          serviceAllocatedAmount,
        });

        return {
          ...s,
          contract_value: svcFiancials.contractValue,
          total_amount: svcFiancials.contractValue,
          invoicedAmount: svcFiancials.invoicedAmount,
          amountPaid: svcFiancials.collectedAmount,
          outstandingAmount: svcFiancials.outstandingAmount,
          paymentStatus: svcFiancials.paymentStatus,
          paymentProgress: svcFiancials.paymentProgress,
          hasCommercialMismatch: svcFiancials.hasCommercialMismatch,
          hasIssuedInvoice: svcFiancials.hasIssuedInvoice,
        };
      });

      return {
        ...client,
        contractValue: clientFinancials.contractValue,
        contract_value: clientFinancials.contractValue,
        invoicedAmount: clientFinancials.invoicedAmount,
        paymentsReceived: clientFinancials.collectedAmount,
        payments_received: clientFinancials.collectedAmount,
        balanceReceivable: clientFinancials.invoiceOutstanding,
        balance_receivable: clientFinancials.invoiceOutstanding,
        contractBalance: clientFinancials.contractBalance,
        unallocatedAdvance: clientFinancials.unallocatedAdvance,
        services: enrichedServices,
      };
    });
  } catch (err) {
    console.warn("fetchClientsAction notice:", err);
    return [];
  }
}

export async function fetchSalespeopleAction() {
  if (!isSupabaseConfigured()) {
    return [
      { id: "00000000-0000-0000-0000-000000000001", full_name: "Admin User", email: "admin@brand360s.com", role: "admin", is_active: true },
      { id: "00000000-0000-0000-0000-000000000002", full_name: "Employee1", email: "sales1@brand360s.com", role: "employee", is_active: true },
      { id: "00000000-0000-0000-0000-000000000003", full_name: "Employee2", email: "sales2@brand360s.com", role: "employee", is_active: true },
    ];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .order("full_name");

    if (error) {
      console.error("Error fetching salespeople:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("fetchSalespeopleAction notice:", err);
    return [];
  }
}

/**
 * Lightweight client list for dropdown selectors in modals and forms.
 * Avoids heavy joins and sub-table scans.
 */
export async function fetchClientsDropdownAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, client_code, contract_value, balance_receivable, client_status")
    .neq("client_status", "Archived")
    .order("company_name", { ascending: true });

  if (error) {
    console.error("Error fetching clients dropdown:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch client commercial and billing summary including contract value (excl. GST),
 * total invoiced (incl. GST), verified payments received, remaining invoice balance,
 * and maximum permitted payment for real-time validation.
 *
 * Source of truth:
 * - Contract Value = agreed value of active services (excl. GST)
 * - Total Invoiced = SUM(total_amount) of issued valid invoices (incl. GST)
 * - Previously Received = SUM(verified non-reversed payments)
 * - Remaining Invoice Balance = SUM(balance_due of issued valid invoices)
 * - Maximum Permitted = Remaining Invoice Balance (Total eligible outstanding to be paid)
 */
export async function fetchClientContractSummaryAction(clientId: string) {
  if (!clientId) return null;
  const supabase = await createClient();

  const [clientRes, servicesRes, invoicesRes, paymentsRes, allocsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, company_name, client_code, contract_value, balance_receivable")
      .eq("id", clientId)
      .single(),
    supabase
      .from("client_services")
      .select("id, total_amount, service_fee, govt_fee, additional_fee, discount, service_status")
      .eq("client_id", clientId),
    supabase
      .from("invoices")
      .select("id, total_amount, amount_paid, balance_due, status")
      .eq("client_id", clientId)
      .not("status", "in", '("Draft","Void","Cancelled")'),
    supabase
      .from("payments")
      .select("amount, status")
      .eq("client_id", clientId)
      .eq("status", "Verified"),
    supabase
      .from("invoice_payment_allocations")
      .select("invoice_id, allocated_amount"),
  ]);

  if (clientRes.error || !clientRes.data) return null;
  const client = clientRes.data;

  // 1. Contract Value = active services contract fees (excl GST)
  const activeServices = (servicesRes.data || []).filter(
    (s: any) => s.service_status !== "Cancelled"
  );
  const contractValue = activeServices.length > 0
    ? activeServices.reduce((sum: number, s: any) => {
        const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0) + (Number(s.additional_fee) || 0) - (Number(s.discount) || 0));
        return sum + amt;
      }, 0)
    : Number(client.contract_value) || 0;

  // 2. Total Invoiced = eligible issued invoices (incl GST)
  const validInvoices = invoicesRes.data || [];
  const totalInvoiced = validInvoices.reduce(
    (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
    0
  );

  // 3. Previously Received = verified payments
  const totalVerifiedReceived = (paymentsRes.data || []).reduce(
    (sum: number, p: any) => sum + (Number(p.amount) || 0),
    0
  );

  const allocationsByInvoice: Record<string, number> = {};
  (allocsRes.data || []).forEach((a: any) => {
    if (a.invoice_id) {
      allocationsByInvoice[a.invoice_id] =
        (allocationsByInvoice[a.invoice_id] || 0) + (Number(a.allocated_amount) || 0);
    }
  });

  // 4. Remaining Invoice Balance = SUM(balance of issued valid invoices based on live allocations)
  const remainingInvoiceBalance = validInvoices.reduce((sum: number, inv: any) => {
    const invTotal = Number(inv.total_amount) || 0;
    const invAllocated = allocationsByInvoice[inv.id];
    let bal: number;
    if (typeof invAllocated === "number") {
      bal = Math.max(0, invTotal - invAllocated);
    } else if (inv.balance_due !== undefined && inv.balance_due !== null) {
      bal = Number(inv.balance_due);
    } else {
      bal = Math.max(0, invTotal - (Number(inv.amount_paid) || 0));
    }
    return sum + bal;
  }, 0);

  // Remaining contract balance (for informational tracking)
  const remainingContractBalance = Math.max(0, contractValue - totalVerifiedReceived);

  // Payment Limit: Maximum Permitted is the outstanding balance of issued invoices
  const maximumPermittedPayment = Math.max(0, remainingInvoiceBalance);

  return {
    clientId: client.id,
    companyName: client.company_name,
    clientCode: client.client_code,
    contractValue,
    totalInvoiced,
    previouslyReceived: totalVerifiedReceived,
    remainingContractBalance,
    remainingInvoiceBalance,
    maximumPermittedPayment,
  };
}

/**
 * Fast aggregated KPIs summary for the Clients portfolio header cards.
 * Performs a lean database query without retrieving full nested services/allocations.
 */
export async function fetchClientsKpiSummaryAction() {
  const supabase = await createClient();

  const [clientsRes, servicesRes, invoicesRes, paymentsRes, allocsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, client_status, contract_value, payments_received, balance_receivable"),
    supabase
      .from("client_services")
      .select("client_id, total_amount, service_fee, govt_fee, service_status"),
    supabase
      .from("invoices")
      .select("id, client_id, total_amount, amount_paid, balance_due, status")
      .not("status", "in", '("Draft","Void","Cancelled")'),
    supabase
      .from("payments")
      .select("client_id, amount, status"),
    supabase
      .from("invoice_payment_allocations")
      .select("invoice_id, allocated_amount"),
  ]);

  const clients = clientsRes.data || [];
  const services = servicesRes.data || [];
  const invoices = invoicesRes.data || [];
  const payments = paymentsRes.data || [];
  const allocations = allocsRes.data || [];

  const allocationsByInvoice: Record<string, number> = {};
  allocations.forEach((a: any) => {
    if (a.invoice_id) {
      allocationsByInvoice[a.invoice_id] =
        (allocationsByInvoice[a.invoice_id] || 0) + (Number(a.allocated_amount) || 0);
    }
  });

  let totalNonArchived = 0;
  let activeOperationalCount = 0;
  let archivedCount = 0;
  let totalContractValue = 0;
  let amountCollected = 0;
  let totalOutstanding = 0;

  for (const c of clients) {
    if (c.client_status === "Archived") {
      archivedCount++;
      continue;
    }

    totalNonArchived++;
    if (c.client_status === "Active") {
      activeOperationalCount++;
    }

    // Active services for this client
    const cSvcs = services.filter((s: any) => s.client_id === c.id && s.service_status !== "Cancelled");
    const cContract = cSvcs.reduce((sum: number, s: any) => {
      const amt = Number(s.total_amount) || ((Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0));
      return sum + amt;
    }, 0);

    // Confirmed payments for this client
    const cPmts = payments.filter((p: any) =>
      p.client_id === c.id &&
      (["Verified", "Completed", "Received"].includes(p.status) || (!["Pending", "Failed", "Cancelled", "Reversed"].includes(p.status) && p.status !== undefined))
    );
    const cCollected = cPmts.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    // Issued invoices outstanding for this client
    const cInvs = invoices.filter((i: any) => i.client_id === c.id);
    const cOutstanding = cInvs.reduce((sum: number, i: any) => {
      const invTotal = Number(i.total_amount) || 0;
      const invAllocated = allocationsByInvoice[i.id];
      let bal: number;
      if (typeof invAllocated === "number") {
        bal = Math.max(0, invTotal - invAllocated);
      } else if (i.balance_due !== undefined && i.balance_due !== null) {
        bal = Number(i.balance_due);
      } else {
        bal = Math.max(0, invTotal - (Number(i.amount_paid) || 0));
      }
      return sum + bal;
    }, 0);

    totalContractValue += cContract;
    amountCollected += cCollected;
    totalOutstanding += cOutstanding;
  }

  return {
    totalNonArchived,
    activeOperationalCount,
    archivedCount,
    totalContractValue,
    amountCollected,
    totalOutstanding,
  };
}
