"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { ClientRecord } from "@/data/mockClients";
import { formatINR } from "@/lib/utils";

interface ClientsTableProps {
  clients: ClientRecord[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          {/* Navy Blue Table Header matching image */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3.5 px-4 w-12 text-center font-semibold">No.</th>
              <th className="py-3.5 px-5 min-w-[180px] font-semibold">Company Name</th>
              <th className="py-3.5 px-4 min-w-[130px] font-semibold">Salesperson</th>
              <th className="py-3.5 px-5 min-w-[200px] font-semibold">Services Purchased</th>
              <th className="py-3.5 px-4 text-right min-w-[120px] font-semibold">Contract Value</th>
              <th className="py-3.5 px-4 text-right min-w-[130px] font-semibold">Payment Received</th>
              <th className="py-3.5 px-4 text-right min-w-[130px] font-semibold">Balance Receivable</th>
              <th className="py-3.5 px-5 min-w-[160px] font-semibold">Next Payment Due</th>
              <th className="py-3.5 px-4 text-center w-16 font-semibold"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                  No client records found matching your filters.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                return (
                  <tr 
                    key={client.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* No. */}
                    <td className="py-4 px-4 font-bold text-slate-800 text-center">
                      {client.no}
                    </td>

                    {/* Company Name in Teal Blue (#0481A2) */}
                    <td className="py-4 px-5 font-bold">
                      <Link 
                        href={`/clients/${client.id}`}
                        className="text-[#0481A2] hover:text-[#036c88] transition-colors"
                      >
                        {client.companyName}
                      </Link>
                    </td>

                    {/* Salesperson */}
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {client.salesperson}
                    </td>

                    {/* Services Purchased */}
                    <td className="py-4 px-5 text-slate-600 font-normal">
                      {client.servicesPurchased}
                    </td>

                    {/* Contract Value */}
                    <td className="py-4 px-4 text-right font-semibold text-slate-800">
                      {formatINR(client.contractValue)}
                    </td>

                    {/* Payments Received */}
                    <td className="py-4 px-4 text-right font-semibold text-slate-800">
                      {formatINR(client.paymentsReceived)}
                    </td>

                    {/* Balance Receivable */}
                    <td className="py-4 px-4 text-right font-semibold text-slate-800">
                      {formatINR(client.balanceReceivable)}
                    </td>

                    {/* Next Payment Due: Bold Amount & Subtitle Date */}
                    <td className="py-4 px-5">
                      {client.paymentStatus === "Paid in full" || client.nextPaymentDueAmount === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Paid in full
                        </span>
                      ) : (
                        <div className="leading-tight">
                          <span className="font-bold text-slate-900 block text-sm">
                            {formatINR(client.nextPaymentDueAmount)}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                            {client.nextPaymentDueDate}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Action Eye Icon Button */}
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#F0F8FA] hover:bg-[#E0F2F7] text-[#0481A2] border border-[#D5EBF1] transition-all shadow-2xs"
                        title="View client details"
                      >
                        <Eye size={16} strokeWidth={2} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
