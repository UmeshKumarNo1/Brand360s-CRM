"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
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
  const services_purchased = (formData.get("services_purchased") as string)?.trim() || "General";
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
      const parsed = parseInitialPhone(phone);
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
      const parsedAlt = parseInitialPhone(alternate_phone);
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
  } else if (contract_value > 0 && payments_received > contract_value) {
    fieldErrors.payments_received = `Payments received (₹${payments_received.toLocaleString()}) cannot exceed total contract value (₹${contract_value.toLocaleString()}).`;
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
        start_date,
        expected_completion_date,
        service_status,
        assigned_profile:profiles!assigned_employee_id(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients with services, falling back to basic query:", error);
    const { data: fallbackData } = await supabase
      .from("clients")
      .select(`
        *,
        assigned_profile:profiles!assigned_salesperson(full_name, email)
      `)
      .order("created_at", { ascending: false });
    return fallbackData || [];
  }

  // Extract all client service IDs to fetch payment allocations
  const allServiceIds: string[] = [];
  (data || []).forEach((c: any) => {
    (c.services || []).forEach((s: any) => {
      if (s.id) allServiceIds.push(s.id);
    });
  });

  const paidByService: Record<string, number> = {};

  if (allServiceIds.length > 0) {
    // 1. Direct allocations to client_service_id (restricted strictly to this portfolio's services)
    const { data: directAllocs } = await supabase
      .from("invoice_payment_allocations")
      .select("client_service_id, invoice_id, allocated_amount")
      .in("client_service_id", allServiceIds);

    (directAllocs || []).forEach((a: any) => {
      if (a.client_service_id) {
        paidByService[a.client_service_id] =
          (paidByService[a.client_service_id] || 0) + (Number(a.allocated_amount) || 0);
      }
    });

    // 2. Targeted lookup for allocations where client_service_id wasn't stamped directly
    // Only query invoice_items matching our service IDs
    const { data: invoiceItems } = await supabase
      .from("invoice_items")
      .select("invoice_id, client_service_id")
      .in("client_service_id", allServiceIds);

    if (invoiceItems && invoiceItems.length > 0) {
      const invoiceToServiceMap: Record<string, string> = {};
      const relevantInvoiceIds: string[] = [];
      invoiceItems.forEach((item: any) => {
        if (item.invoice_id && item.client_service_id) {
          invoiceToServiceMap[item.invoice_id] = item.client_service_id;
          relevantInvoiceIds.push(item.invoice_id);
        }
      });

      if (relevantInvoiceIds.length > 0) {
        const { data: indirectAllocs } = await supabase
          .from("invoice_payment_allocations")
          .select("invoice_id, client_service_id, allocated_amount")
          .in("invoice_id", relevantInvoiceIds);

        (indirectAllocs || []).forEach((a: any) => {
          if (!a.client_service_id && a.invoice_id && invoiceToServiceMap[a.invoice_id]) {
            const resolvedSvcId = invoiceToServiceMap[a.invoice_id];
            // Only add if not already counted via direct alloc
            const alreadyPaid = paidByService[resolvedSvcId] || 0;
            if (alreadyPaid === 0) {
              paidByService[resolvedSvcId] = (paidByService[resolvedSvcId] || 0) + (Number(a.allocated_amount) || 0);
            }
          }
        });
      }
    }
  }

  // Enrich each client's services with paymentStatus and amountPaid
  return (data || []).map((client: any) => {
    const enrichedServices = (client.services || []).map((s: any) => {
      const contractVal = Number(s.total_amount) || (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);
      const paid = paidByService[s.id] || 0;

      let paymentStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
      if (contractVal > 0 && paid >= contractVal - 0.009) {
        paymentStatus = "Paid";
      } else if (paid > 0.009) {
        paymentStatus = "Partial";
      }

      return {
        ...s,
        amountPaid: paid,
        paymentStatus,
      };
    });

    return {
      ...client,
      services: enrichedServices,
    };
  });
}

export async function fetchSalespeopleAction() {
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
 * Fetch client commercial summary including contract value, verified payments,
 * and remaining contract balance for real-time validation.
 */
export async function fetchClientContractSummaryAction(clientId: string) {
  if (!clientId) return null;
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, company_name, client_code, contract_value, balance_receivable")
    .eq("id", clientId)
    .single();

  if (clientError || !client) return null;

  const { data: verifiedPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("client_id", clientId)
    .eq("status", "Verified");

  const totalVerifiedReceived = (verifiedPayments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const contractValue = Number(client.contract_value) || 0;
  const remainingContractBalance = Math.max(0, contractValue - totalVerifiedReceived);

  return {
    clientId: client.id,
    companyName: client.company_name,
    clientCode: client.client_code,
    contractValue,
    previouslyReceived: totalVerifiedReceived,
    remainingContractBalance,
    maximumPermittedPayment: remainingContractBalance,
  };
}

/**
 * Fast aggregated KPIs summary for the Clients portfolio header cards.
 * Performs a lean database query without retrieving full nested services/allocations.
 */
export async function fetchClientsKpiSummaryAction() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("client_status, contract_value, payments_received, balance_receivable");

  if (error || !clients) {
    console.error("Error fetching clients KPI summary:", error);
    return {
      totalNonArchived: 0,
      activeOperationalCount: 0,
      archivedCount: 0,
      totalContractValue: 0,
      amountCollected: 0,
      totalOutstanding: 0,
    };
  }

  let totalNonArchived = 0;
  let activeOperationalCount = 0;
  let archivedCount = 0;
  let totalContractValue = 0;
  let amountCollected = 0;
  let totalOutstanding = 0;

  for (const c of clients) {
    if (c.client_status === "Archived") {
      archivedCount++;
    } else {
      totalNonArchived++;
      if (c.client_status === "Active") {
        activeOperationalCount++;
      }
      totalContractValue += Number(c.contract_value) || 0;
      amountCollected += Number(c.payments_received) || 0;
      totalOutstanding += Number(c.balance_receivable) || 0;
    }
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
