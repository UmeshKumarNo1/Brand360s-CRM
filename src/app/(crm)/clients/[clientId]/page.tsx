import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { MOCK_CLIENTS } from "@/data/mockClients";
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

  // Fallback to mock record if not found (or for initial demo ids)
  const client = dbClient
    ? {
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
      }
    : {
        id: resolvedParams.clientId,
        clientCode: "B360-1001",
        companyName: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.companyName || "Example Industries",
        tradeName: null,
        companyType: "Private Limited (Pvt Ltd)",
        salesperson: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.salesperson || "Yogeetha",
        assignedSalespersonId: null,
        createdBy: null,
        servicesPurchased: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.servicesPurchased || "Annual Compliance, Website",
        contractValue: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.contractValue || 150000,
        paymentsReceived: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.paymentsReceived || 90000,
        balanceReceivable: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.balanceReceivable || 60000,
        nextPaymentDueDate: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.nextPaymentDueDate || "10 Jan 2027",
        nextPaymentDueAmount: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.nextPaymentDueAmount || 20000,
        paymentStatus: MOCK_CLIENTS.find((c) => c.id === resolvedParams.clientId)?.paymentStatus || "Overdue",
        contactPerson: "Rahul Sharma",
        designation: "Managing Director",
        phone: "+91 98765 43210",
        alternatePhone: null,
        email: "billing@example.com",
        address: "123 Business Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
        billingName: null,
        billingAddress: null,
        billingContact: null,
        billingEmail: null,
        additionalContacts: [],
        clientSince: "2025-01-10",
        clientStatus: "Active",
        gst: "27AAAAA0000A1Z5",
        pan: "ABCDE1234F",
        website: "https://example.com",
        notes: "Priority client with quarterly compliance check-ins.",
        createdAt: "Jan 10, 2025",
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
