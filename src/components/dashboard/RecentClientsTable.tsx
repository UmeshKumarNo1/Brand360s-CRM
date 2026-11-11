import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RecentClientsTableProps {
  clients?: any[];
}

export function RecentClientsTable({ clients = [] }: RecentClientsTableProps) {
  const fallbackClients = [
    {
      id: "1",
      company_name: "Nova Digital Pvt. Ltd.",
      services_purchased: "Pvt. Ltd. Registration",
      assigned_profile: { full_name: "Riya Patil" },
      payment_status: "Processing",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      company_name: "Vertex Solutions LLP",
      services_purchased: "LLP Registration",
      assigned_profile: { full_name: "Amit Kadam" },
      payment_status: "Documents Pending",
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      company_name: "BlueCore Industries",
      services_purchased: "GST Registration",
      assigned_profile: { full_name: "Sneha Joshi" },
      payment_status: "Completed",
      created_at: new Date().toISOString(),
    },
  ];

  const displayList = clients.length > 0 ? clients : fallbackClients;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Recent Clients</h3>
          <p className="text-xs text-slate-500">Latest client onboarding & requests</p>
        </div>
        <Link 
          href="/clients" 
          className="text-xs font-semibold text-[#077EA1] hover:text-[#066B89] flex items-center gap-1"
        >
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <th className="pb-2.5">Company Name</th>
              <th className="pb-2.5">Service</th>
              <th className="pb-2.5">Assigned To</th>
              <th className="pb-2.5">Status</th>
              <th className="pb-2.5 text-right">Created On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayList.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 font-semibold">
                  <Link href={`/clients/${c.id}`} className="text-[#077EA1] hover:underline">
                    {c.company_name}
                  </Link>
                </td>
                <td className="py-2.5 text-slate-600">{c.services_purchased || "General"}</td>
                <td className="py-2.5 text-slate-700 font-medium">{c.assigned_profile?.full_name || "Assigned"}</td>
                <td className="py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                    {c.payment_status || "Active"}
                  </span>
                </td>
                <td className="py-2.5 text-slate-500 text-right">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "Today"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
