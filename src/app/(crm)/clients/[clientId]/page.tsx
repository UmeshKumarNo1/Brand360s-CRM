import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { ClientDetailView } from "@/components/clients/ClientDetailView";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<{ addService?: string; tab?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialAddService = resolvedSearchParams.addService === "true";
  const initialTab = (resolvedSearchParams.tab as any) || (initialAddService ? "services" : "overview");

  const supabase = await createClient();
  const profile = await getCurrentUserProfileAction();

  const isAdmin = profile?.role === "admin";

  // Fetch actual client from Supabase
  const { data: dbClient } = await supabase
    .from("clients")
    .select(`
      *,
      assigned_profile:profiles!assigned_salesperson(full_name, email)
    `)
    .eq("id", resolvedParams.clientId)
    .single();

  // If client does not exist or user doesn't have access under RLS, return 404
  if (!dbClient) {
    notFound();
  }

  const client = {
    id: dbClient.id,
    clientCode: dbClient.client_code,
    companyName: dbClient.company_name,
    tradeName: dbClient.trade_name || null,
    companyType: dbClient.company_type,
    salesperson: dbClient.assigned_profile?.full_name || "Unassigned",
    assignedSalespersonId: dbClient.assigned_salesperson,
    createdBy: dbClient.created_by,
    servicesPurchased: dbClient.services_purchased || "Company Registration",
    contractValue: Number(dbClient.contract_value) || 0,
    paymentsReceived: Number(dbClient.payments_received) || 0,
    balanceReceivable: Number(dbClient.balance_receivable) || 0,
    nextPaymentDueDate: dbClient.next_payment_due_date || "-",
    nextPaymentDueAmount: Number(dbClient.next_payment_due_amount) || 0,
    paymentStatus: dbClient.payment_status || "Upcoming",
    contactPerson: dbClient.contact_person,
    designation: dbClient.designation || null,
    phone: dbClient.phone,
    alternatePhone: dbClient.alternate_phone || null,
    email: dbClient.email,
    address: dbClient.address || null,
    city: dbClient.city,
    state: dbClient.state,
    pincode: dbClient.pincode || null,
    country: dbClient.country || "India",
    billingName: dbClient.billing_name || null,
    billingAddress: dbClient.billing_address || null,
    billingContact: dbClient.billing_contact || null,
    billingEmail: dbClient.billing_email || null,
    additionalContacts: dbClient.additional_contacts || [],
    clientSince: dbClient.client_since || null,
    clientStatus: dbClient.client_status || "Active",
    gst: dbClient.gst_number,
    pan: dbClient.pan_number,
    website: dbClient.website,
    notes: dbClient.notes,
    createdAt: dbClient.created_at ? new Date(dbClient.created_at).toLocaleDateString("en-IN") : "-",
  };

  // Only Admin or the authorized employee owner can edit
  const canEdit = isAdmin || (profile && (client.assignedSalespersonId === profile.id || client.createdBy === profile.id));

  return (
    <ClientDetailView
      client={client}
      isAdmin={Boolean(isAdmin)}
      canEdit={Boolean(canEdit)}
      initialTab={initialTab}
      initialAddService={initialAddService}
    />
  );
}
