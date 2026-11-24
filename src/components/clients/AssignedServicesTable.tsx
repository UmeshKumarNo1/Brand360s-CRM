"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { AssignedServiceItem } from "@/app/actions/assigned-services";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface AssignedServicesTableProps {
  services: AssignedServiceItem[];
  onOpenStageModal: (serviceId: string) => void;
  isAdmin?: boolean;
}

export function AssignedServicesTable({
  services,
  onOpenStageModal,
  isAdmin = false,
}: AssignedServicesTableProps) {
  if (services.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center text-slate-500 shadow-2xs">
        <Briefcase size={36} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
        <h3 className="text-base font-bold text-slate-800">No Assigned Services</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          You currently have no service deliverables individually assigned to you. Services assigned to you by administrators will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold">
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider text-left">Client & Owner</th>
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider text-left">Service</th>
              <th className="py-2.5 px-2.5 font-semibold text-xs tracking-wider text-right whitespace-nowrap">Contract Value</th>
              <th className="py-2.5 px-2 text-center font-semibold text-xs tracking-wider whitespace-nowrap">Payment</th>
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider text-center">Fulfillment Progress</th>
              <th className="py-2.5 px-2.5 font-semibold text-xs tracking-wider text-center whitespace-nowrap">Current Stage</th>
              <th className="py-2.5 px-2.5 font-semibold text-xs tracking-wider text-center whitespace-nowrap">Target Date</th>
              {isAdmin && (
                <th className="py-2.5 px-2.5 font-semibold text-xs tracking-wider text-center whitespace-nowrap">Assignee</th>
              )}
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider text-center whitespace-nowrap">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors h-[64px]">
                {/* Client / Owner */}
                <td className="py-2 px-3 align-middle">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 whitespace-nowrap">
                    <Link
                      href={`/clients/${item.clientId}`}
                      className="hover:text-[#0481A2] hover:underline flex items-center gap-1"
                    >
                      <span>{item.clientName}</span>
                      <ExternalLink size={11} className="text-slate-400 hover:text-[#0481A2]" />
                    </Link>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                    <span className="font-mono text-slate-400">{item.clientCode}</span>
                    <span>&bull;</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
                      <User size={10} className="text-slate-400" />
                      Owner: {item.clientSalespersonName}
                    </span>
                  </div>
                </td>

                {/* Service Name & Category */}
                <td className="py-2 px-3 align-middle">
                  <Link
                    href={`/services/${item.id}`}
                    className="font-semibold text-slate-800 hover:text-[#0481A2] hover:underline block whitespace-nowrap"
                  >
                    {item.serviceName}
                  </Link>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{item.serviceCategory}</span>
                </td>

                {/* Contract Value */}
                <td className="py-2 px-2.5 text-right font-bold font-number text-slate-900 whitespace-nowrap align-middle">
                  {formatINR(item.contractValue)}
                </td>

                {/* Payment Status */}
                <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                  <PaymentStatusBadge
                    status={
                      item.paymentStatus === "Paid"
                        ? "Paid in full"
                        : item.paymentStatus === "Partially Paid"
                        ? "Partially Paid"
                        : item.paymentStatus === "Overdue"
                        ? "Overdue"
                        : "Upcoming"
                    }
                  />
                </td>

                {/* Fulfillment Progress */}
                <td className="py-2 px-3 align-middle min-w-[120px]">
                  <div className="w-full">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-600">{item.progressPercentage}%</span>
                      <span className="text-[10px] text-slate-400">{item.serviceStatus}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage))}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Current Stage */}
                <td className="py-2 px-2.5 text-center whitespace-nowrap align-middle">
                  <button
                    onClick={() => onOpenStageModal(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-[#0481A2] border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                    title="Click to view/update fulfillment stage"
                  >
                    <Clock size={10} />
                    <span>{item.currentStageName}</span>
                  </button>
                </td>

                {/* Target Date */}
                <td className="py-2 px-2.5 text-center whitespace-nowrap align-middle text-slate-600 font-mono text-[11px]">
                  {item.expectedCompletionDate ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {item.expectedCompletionDate}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>

                {/* Assignee (visible to Admin) */}
                {isAdmin && (
                  <td className="py-2 px-2.5 text-center whitespace-nowrap align-middle text-slate-700 text-xs font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {item.assignedEmployeeName}
                    </span>
                  </td>
                )}

                {/* Next Action */}
                <td className="py-2 px-3 text-center whitespace-nowrap align-middle">
                  <button
                    onClick={() => onOpenStageModal(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>{item.nextAction}</span>
                    <ArrowRight size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
