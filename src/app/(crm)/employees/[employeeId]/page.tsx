import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, ShieldCheck, CheckCircle2, XCircle, Building2, Calendar, FileText } from "lucide-react";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { fetchEmployeeDetailsAction } from "@/app/actions/employees";
import { formatINR } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/clients/PaymentStatusBadge";
import { EditEmployeeForm } from "@/components/employees/EditEmployeeForm";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const resolvedParams = await params;
  const currentProfile = await getCurrentUserProfileAction();

  // Protect page: Only Admin can access employee details
  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const data = await fetchEmployeeDetailsAction(resolvedParams.employeeId);

  if (!data) {
    notFound();
  }

  const { profile, clients, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Link
            href="/employees"
            className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                profile.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {profile.is_active ? "Active" : "Deactivated"}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 uppercase">
                {profile.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {profile.email} • Staff ID: {profile.id}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Assigned Clients</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalClients}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Active Clients</span>
          <p className="text-2xl font-bold text-[#0481A2] mt-1">{stats.activeClients}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Fully Paid Clients</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedClients}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Edit Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs h-fit space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b">Edit Staff Profile</h3>
          <EditEmployeeForm profile={profile} />
        </div>

        {/* Right: Assigned Clients Table */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assigned Client Portfolio</h3>
              <p className="text-xs text-slate-500">Clients currently owned or handled by {profile.full_name}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-sky-50 text-[#0481A2] rounded">
              {clients.length} Clients
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="pb-2.5">Company Name</th>
                  <th className="pb-2.5">Services</th>
                  <th className="pb-2.5 text-right">Contract Value</th>
                  <th className="pb-2.5 text-right">Balance</th>
                  <th className="pb-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No clients currently assigned to this employee.
                    </td>
                  </tr>
                ) : (
                  clients.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-semibold">
                        <Link href={`/clients/${c.id}`} className="text-[#0481A2] hover:underline">
                          {c.company_name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-600">{c.services_purchased || "General"}</td>
                      <td className="py-2.5 text-right font-medium text-slate-800">
                        {formatINR(Number(c.contract_value) || 0)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-800">
                        {formatINR(Number(c.balance_receivable) || 0)}
                      </td>
                      <td className="py-2.5 text-center">
                        <PaymentStatusBadge status={c.payment_status || "Upcoming"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
