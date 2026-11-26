"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RecentClientsTableProps {
  clients?: any[];
}

export function RecentClientsTable({ clients = [] }: RecentClientsTableProps) {
  // If no dynamic clients available, provide fallback matching design
  const fallbackClients = [
    {
      id: "1",
      company_name: "Evergreen Foods Pvt. Ltd.",
      services_purchased: "Pvt. Ltd. Registration",
      assigned_profile: { full_name: "Riya Patil" },
      payment_status: "Completed",
      created_at: "2025-01-28T10:00:00.000Z",
    },
    {
      id: "2",
      company_name: "Zenith Tech Solutions",
      services_purchased: "GST Registration",
      assigned_profile: { full_name: "Amit Kadam" },
      payment_status: "Processing",
      created_at: "2025-01-27T10:00:00.000Z",
    },
    {
      id: "3",
      company_name: "BlueCore Industries",
      services_purchased: "Trademark Registration",
      assigned_profile: { full_name: "Sneha Joshi" },
      payment_status: "Documents Pending",
      created_at: "2025-01-25T10:00:00.000Z",
    },
    {
      id: "4",
      company_name: "Vertex Solutions LLP",
      services_purchased: "LLP Registration",
      assigned_profile: { full_name: "Riya Patil" },
      payment_status: "Processing",
      created_at: "2025-01-24T10:00:00.000Z",
    },
    {
      id: "5",
      company_name: "Nova Digital Pvt. Ltd.",
      services_purchased: "Compliance (ROC)",
      assigned_profile: { full_name: "Amit Kadam" },
      payment_status: "Completed",
      created_at: "2025-01-22T10:00:00.000Z",
    },
  ];

  const displayList = clients.length > 0 ? clients : fallbackClients;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Documents Pending":
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Processing":
      case "In Progress":
      default:
        return "bg-sky-50 text-sky-700 border-sky-200/80";
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Clients</h3>
          <p className="text-xs text-slate-500">Latest client onboarding &amp; service requests</p>
        </div>
        <Link 
          href="/clients" 
          className="text-xs font-semibold text-[#0481A2] hover:text-[#036c88] flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <th className="pb-3 text-left">Company Name</th>
              <th className="pb-3 text-left">Service</th>
              <th className="pb-3 text-left">Assigned To</th>
              <th className="pb-3 text-center">Status</th>
              <th className="pb-3 text-right">Created On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayList.map((c) => {
              const assignedName = c.assigned_profile?.full_name || "Assigned Staff";
              const initials = getInitials(assignedName);
              const statusPillClass = getStatusBadge(c.payment_status);

              return (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Company Name */}
                  <td className="py-3 font-semibold text-left">
                    <Link href={`/clients/${c.id}`} className="text-slate-900 hover:text-[#0481A2] transition-colors">
                      {c.company_name}
                    </Link>
                  </td>

                  {/* Service */}
                  <td className="py-3 text-slate-600 text-left font-medium">
                    {c.services_purchased || "Company Registration"}
                  </td>

                  {/* Assigned To with Initials Avatar */}
                  <td className="py-3 text-slate-700 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#243E76]/10 text-[#243E76] text-[9px] font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <span className="font-medium text-slate-800 text-xs">{assignedName}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border inline-block ${statusPillClass}`}>
                      {c.payment_status || "Processing"}
                    </span>
                  </td>

                  {/* Created On */}
                  <td className="py-3 text-slate-500 text-right font-sans font-number">
                    {formatDate(c.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
