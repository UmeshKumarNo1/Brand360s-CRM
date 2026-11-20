import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Code2,
  Sparkles,
  Home,
  Layers,
} from "lucide-react";
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
      {/* 1. Page Header matching Reference Image 1 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Icon, Service Name, Tag, Breadcrumb */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href={`/clients/${clientId}?tab=services`}
            className="w-12 h-12 rounded-2xl bg-[#1E293B] hover:bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-sm transition-all group"
            title="Back to Client Services"
          >
            <Code2 size={22} className="text-white group-hover:scale-105 transition-transform" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans truncate">
                {matchedService.serviceName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#E0F7FA] text-[#0481A2] border border-[#B2EBF2] shrink-0">
                <Sparkles size={11} className="text-[#0481A2]" />
                <span>{matchedService.serviceCategory || "Branding & Web Development"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Home size={13} className="text-slate-400 shrink-0" />
              <span className="text-slate-400">&gt;</span>
              <Link
                href={`/clients/${clientId}`}
                className="font-medium text-slate-700 hover:text-[#0481A2] hover:underline truncate"
              >
                {client?.company_name} ({client?.client_code || "N/A"})
              </Link>
            </div>
          </div>
        </div>

        {/* Right: 4 Financial Metric Highlights matching Reference Image 1 */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs bg-white px-5 sm:px-6 py-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
          {/* Contract Value */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
              <Layers size={17} />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium leading-none mb-1">Contract Value</span>
              <strong className="text-slate-900 font-bold text-sm font-sans font-number block leading-none">
                {formatINR(matchedService.contractValue)}
              </strong>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-slate-100" />

          {/* Invoiced (Incl. GST) */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
              <FileText size={17} />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium leading-none mb-1">Invoiced (Incl. GST)</span>
              <strong className="text-slate-900 font-bold text-sm font-sans font-number block leading-none">
                {formatINR(matchedService.invoicedAmount)}
              </strong>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-slate-100" />

          {/* Collected */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={17} />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium leading-none mb-1">Collected</span>
              <strong className="text-emerald-600 font-bold text-sm font-sans font-number block leading-none">
                {formatINR(matchedService.collectedAmount)}
              </strong>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-slate-100" />

          {/* Outstanding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Clock size={17} />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-medium leading-none mb-1">Outstanding</span>
              <strong className="text-rose-600 font-bold text-sm font-sans font-number block leading-none">
                {formatINR(matchedService.outstandingAmount)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Detailed Service Card matching Reference Image 1 */}
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
