"use client";

import Link from "next/link";
import { Eye, Trash2, Archive, RotateCcw, UserCheck } from "lucide-react";
import { ClientRecord } from "@/data/mockClients";
import { formatINR } from "@/lib/utils";

interface ClientsTableProps {
  clients: ClientRecord[];
  isAdmin?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  onDeleteClient?: (client: ClientRecord) => void;
  onArchiveClient?: (client: ClientRecord) => void;
  onRestoreClient?: (client: ClientRecord) => void;
  onReassignClient?: (client: ClientRecord) => void;
}

export function ClientsTable({
  clients,
  isAdmin = false,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  isAllSelected = false,
  onDeleteClient,
  onArchiveClient,
  onRestoreClient,
  onReassignClient,
}: ClientsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          {/* Navy Blue Table Header */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              {isAdmin && onToggleSelect && (
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected && clients.length > 0}
                    onChange={onSelectAll}
                    className="rounded border-slate-300 text-[#0481A2] focus:ring-[#0481A2] cursor-pointer"
                  />
                </th>
              )}
              <th className="py-3.5 px-4 w-12 text-center font-semibold">No.</th>
              <th className="py-3.5 px-5 min-w-[180px] font-semibold">Company Name</th>
              <th className="py-3.5 px-4 min-w-[130px] font-semibold">Salesperson</th>
              <th className="py-3.5 px-5 min-w-[200px] font-semibold">Services Purchased</th>
              <th className="py-3.5 px-4 text-right min-w-[120px] font-semibold">Contract Value</th>
              <th className="py-3.5 px-4 text-right min-w-[130px] font-semibold">Payment Received</th>
              <th className="py-3.5 px-4 text-right min-w-[130px] font-semibold">Balance Receivable</th>
              <th className="py-3.5 px-5 min-w-[160px] font-semibold">Next Payment Due</th>
              <th className="py-3.5 px-4 text-center w-28 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={isAdmin && onToggleSelect ? 10 : 9} className="py-12 text-center text-slate-400 text-sm">
                  No client records found matching your filters.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const isSelected = selectedIds.includes(client.id);
                const isArchived = client.clientStatus === "Archived";

                return (
                  <tr
                    key={client.id}
                    className={`hover:bg-slate-50/70 transition-colors duration-150 ${
                      isSelected ? "bg-teal-50/40" : ""
                    } ${isArchived ? "opacity-75 bg-slate-50/30" : ""}`}
                  >
                    {/* Checkbox for Admin bulk selection */}
                    {isAdmin && onToggleSelect && (
                      <td className="py-4 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(client.id)}
                          className="rounded border-slate-300 text-[#0481A2] focus:ring-[#0481A2] cursor-pointer"
                        />
                      </td>
                    )}

                    {/* No. */}
                    <td className="py-4 px-4 font-bold text-slate-800 text-center">
                      {client.no}
                    </td>

                    {/* Company Name */}
                    <td className="py-4 px-5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-[#0481A2] hover:text-[#036c88] transition-colors"
                        >
                          {client.companyName}
                        </Link>
                        {isArchived && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Archived
                          </span>
                        )}
                      </div>
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

                    {/* Next Payment Due */}
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

                    {/* Action Buttons */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#F0F8FA] hover:bg-[#E0F2F7] text-[#0481A2] border border-[#D5EBF1] transition-all shadow-2xs"
                          title="View client details"
                        >
                          <Eye size={13} strokeWidth={2} />
                        </Link>

                        {/* Admin Reassign Quick Action */}
                        {isAdmin && onReassignClient && (
                          <button
                            onClick={() => onReassignClient(client)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all shadow-2xs cursor-pointer"
                            title="Reassign Salesperson (Admin)"
                          >
                            <UserCheck size={13} strokeWidth={2} />
                          </button>
                        )}

                        {/* Admin Restore Action (if archived) */}
                        {isAdmin && isArchived && onRestoreClient && (
                          <button
                            onClick={() => onRestoreClient(client)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 transition-all shadow-2xs cursor-pointer"
                            title="Restore Client to Active"
                          >
                            <RotateCcw size={13} strokeWidth={2} />
                          </button>
                        )}

                        {/* Admin Delete Action */}
                        {isAdmin && onDeleteClient && (
                          <button
                            onClick={() => onDeleteClient(client)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-2xs cursor-pointer"
                            title="Delete or Archive Client (Admin)"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        )}
                      </div>
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
