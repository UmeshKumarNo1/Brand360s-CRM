"use client";

import Link from "next/link";
import { ClientRecord } from "@/data/mockClients";
import { formatINR } from "@/lib/utils";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface ClientsTableProps {
  clients: ClientRecord[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
              <th className="py-3 px-4 w-12 text-center">No.</th>
              <th className="py-3 px-4 min-w-[180px]">Company Name</th>
              <th className="py-3 px-4 min-w-[130px]">Salesperson</th>
              <th className="py-3 px-4 min-w-[200px]">Services Purchased</th>
              <th className="py-3 px-4 text-right min-w-[120px]">Contract Value</th>
              <th className="py-3 px-4 text-right min-w-[130px]">Payments Received</th>
              <th className="py-3 px-4 text-right min-w-[130px]">Balance Receivable</th>
              <th className="py-3 px-4 min-w-[160px]">Next Payment Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                  No client records found matching your filters.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                return (
                  <tr 
                    key={client.id}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    {/* No. */}
                    <td className="py-3.5 px-4 font-semibold text-slate-600 text-center">
                      {client.no}
                    </td>

                    {/* Company Name */}
                    <td className="py-3.5 px-4 font-semibold">
                      <Link 
                        href={`/clients/${client.id}`}
                        className="text-[#077EA1] hover:text-[#066B89] underline underline-offset-2 decoration-[#077EA1]/40"
                      >
                        {client.companyName}
                      </Link>
                    </td>

                    {/* Salesperson */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {client.salesperson}
                    </td>

                    {/* Services Purchased */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {client.servicesPurchased}
                    </td>

                    {/* Contract Value */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatINR(client.contractValue)}
                    </td>

                    {/* Payments Received */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatINR(client.paymentsReceived)}
                    </td>

                    {/* Balance Receivable */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatINR(client.balanceReceivable)}
                    </td>

                    {/* Next Payment Due */}
                    <td className="py-3.5 px-4">
                      {client.paymentStatus === "Paid in full" ? (
                        <PaymentStatusBadge status="Paid in full" />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-900 block">
                              {formatINR(client.nextPaymentDueAmount)}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {client.nextPaymentDueDate}
                            </span>
                          </div>
                          {client.paymentStatus === "Overdue" && (
                            <PaymentStatusBadge status="Overdue" />
                          )}
                        </div>
                      )}
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

