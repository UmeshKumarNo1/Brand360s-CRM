import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Building2, Calendar, FileText, CheckCircle2, Clock, User, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { fetchClientDetailedServicesAction } from "@/app/actions/client-detailed-services";
import { ClientDetailedServiceCard } from "@/components/clients/ClientDetailedServiceCard";
import { formatINR } from "@/lib/utils";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const resolvedParams = await params;
  const serviceId = resolvedParams.serviceId;
  const supabase = await createClient();
  const profile = await getCurrentUserProfileAction();

  if (!profile) {
    redirect("/login");
  }

  // 1. Fetch client_service to resolve client_id
  const { data: serviceRecord, error: svcErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      service_status,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", serviceId)
    .single();

  if (svcErr || !serviceRecord) {
    notFound();
  }

  const client = Array.isArray(serviceRecord.client) ? serviceRecord.client[0] : serviceRecord.client;
  const clientId = serviceRecord.client_id;

  // 2. Permission check
  const isAdmin = profile.role === "admin";
  const canEdit = isAdmin || (client && (client.assigned_salesperson === profile.id || client.created_by === profile.id));

  // 3. Fetch detailed services for this client to get full financial breakdown & progress
  const detailedServices = await fetchClientDetailedServicesAction(clientId);
  const matchedService = detailedServices.find((s) => s.id === serviceId);

  if (!matchedService) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation Breadcrumb / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href={`/clients/${clientId}?tab=services`}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Back to Client Services"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {matchedService.serviceName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0481A2] border border-sky-200">
                {matchedService.serviceCategory || "General"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Client:</span>
              <Link
                href={`/clients/${clientId}`}
                className="font-semibold text-slate-800 hover:text-[#0481A2] hover:underline"
              >
                {client?.company_name} ({client?.client_code || "N/A"})
              </Link>
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Contract Value</span>
            <strong className="text-slate-900 font-bold font-sans font-number">{formatINR(matchedService.contractValue)}</strong>
          </div>
          <span className="text-slate-200">|</span>
          <div>
            <span className="text-slate-500 block text-[10px]">Invoiced (Incl. GST)</span>
            <strong className="text-slate-900 font-bold font-sans font-number">{formatINR(matchedService.invoicedAmount)}</strong>
          </div>
          <span className="text-slate-200">|</span>
          <div>
            <span className="text-slate-500 block text-[10px]">Collected</span>
            <strong className="text-emerald-700 font-bold font-sans font-number">{formatINR(matchedService.collectedAmount)}</strong>
          </div>
          <span className="text-slate-200">|</span>
          <div>
            <span className="text-slate-500 block text-[10px]">Outstanding</span>
            <strong className="text-rose-600 font-bold font-sans font-number">{formatINR(matchedService.outstandingAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Main Detailed Service View */}
      <ClientDetailedServiceCard
        service={matchedService}
        index={0}
        totalServices={1}
        defaultExpanded={true}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />
    </div>
  );
}

