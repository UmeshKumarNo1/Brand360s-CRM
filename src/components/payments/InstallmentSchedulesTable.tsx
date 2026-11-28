"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  IndianRupee,
  Pencil,
  Trash2,
  Plus,
  Briefcase,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface InstallmentSchedulesTableProps {
  installments: any[];
  onViewInstallment: (inst: any) => void;
  onPayInstallment: (inst: any) => void;
  onEditInstallment: (inst: any) => void;
  onCancelInstallment: (inst: any) => void;
  onDeleteInstallment: (inst: any) => void;
  onPreviewInvoice: (invoiceId: string) => void;
  onGenerateInvoice?: (inst: any) => void;
  onAddNextInstallment?: (clientId: string, serviceId?: string | null) => void;
}

export function InstallmentSchedulesTable({
  installments,
  onViewInstallment,
  onPayInstallment,
  onEditInstallment,
  onDeleteInstallment,
  onPreviewInvoice,
  onAddNextInstallment,
}: InstallmentSchedulesTableProps) {
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const toggleService = (serviceKey: string) => {
    setExpandedServices((prev) => ({ ...prev, [serviceKey]: prev[serviceKey] === undefined ? false : !prev[serviceKey] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid in full":
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Overdue":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-300";
      case "Due Today":
      case "Due":
        return "bg-amber-50 text-amber-800 border-amber-300";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  // Group flat installments into Client -> Service -> Installment hierarchy
  const clientGroups = useMemo(() => {
    const map = new Map<string, any>();

    (installments || []).forEach((inst: any) => {
      const cId = inst.clientId || inst.client_id || "unknown";
      if (!map.has(cId)) {
        map.set(cId, {
          clientId: cId,
          clientName: inst.clientName || inst.companyName || "Unknown Client",
          clientCode: inst.clientCode || "N/A",
          servicesMap: new Map<string, any>(),
          totalPlan: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          installmentCount: 0,
          nextDueDate: null as string | null,
        });
      }

      const cGroup = map.get(cId);
      const svcId = inst.clientServiceId || inst.client_service_id || inst.invoiceId || "general";
      const svcKey = `${cId}::${svcId}`;

      if (!cGroup.servicesMap.has(svcKey)) {
        const invNum = inst.invoiceNumber || inst.linkedInvoiceNumber || null;
        cGroup.servicesMap.set(svcKey, {
          serviceKey: svcKey,
          serviceId: inst.clientServiceId || inst.client_service_id || null,
          serviceName: inst.serviceName || (invNum ? `Service (${invNum})` : "Service Installment Schedule"),
          invoiceId: inst.invoiceId || inst.linkedInvoiceId || null,
          invoiceNumber: invNum,
          invoicedTotal: Number(inst.invoiceTotal) || 0,
          items: [] as any[],
          totalScheduled: 0,
          received: 0,
          outstanding: 0,
          nextDueDate: null as string | null,
        });
      }

      const sGroup = cGroup.servicesMap.get(svcKey);
      const amt = Number(inst.amount) || 0;
      const paid = Number(inst.amountPaid ?? inst.amount_paid) || 0;
      const rem = Math.max(0, amt - paid);

      sGroup.items.push(inst);
      sGroup.totalScheduled += amt;
      sGroup.received += paid;
      if (Number(inst.invoiceTotal) > sGroup.invoicedTotal) {
        sGroup.invoicedTotal = Number(inst.invoiceTotal);
      }
      if (rem > 0 && inst.dueDate && (!sGroup.nextDueDate || inst.dueDate < sGroup.nextDueDate)) {
        sGroup.nextDueDate = inst.dueDate;
      }

      cGroup.totalReceived += paid;
      cGroup.installmentCount += 1;
      if (rem > 0 && inst.dueDate && (!cGroup.nextDueDate || inst.dueDate < cGroup.nextDueDate)) {
        cGroup.nextDueDate = inst.dueDate;
      }
    });

    return Array.from(map.values()).map((c) => {
      let clientPlanTotal = 0;
      const services = Array.from(c.servicesMap.values()).map((s: any) => {
        s.items.sort((a: any, b: any) => (Number(a.installmentNumber) || 0) - (Number(b.installmentNumber) || 0));
        const svcPlan = s.invoicedTotal > 0 ? s.invoicedTotal : s.totalScheduled;
        s.totalScheduled = svcPlan;
        s.outstanding = Math.max(0, svcPlan - s.received);
        clientPlanTotal += svcPlan;
        const sStatus =
          s.outstanding <= 0.009 && svcPlan > 0
            ? "Paid"
            : s.received > 0
              ? "Partially Paid"
              : "Upcoming";
        return { ...s, status: sStatus };
      });
      c.totalPlan = clientPlanTotal;
      c.totalOutstanding = Math.max(0, clientPlanTotal - c.totalReceived);
      const overallStatus =
        c.totalOutstanding <= 0.009 && c.totalPlan > 0
          ? "Paid"
          : c.totalReceived > 0
            ? "Partially Paid"
            : "Upcoming";
      return { ...c, services, overallStatus };
    });
  }, [installments]);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide">
              <th className="py-2.5 px-3 font-semibold">Client / Service / Installment</th>
              <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap">Client Code</th>
              <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">Total Plan (₹)</th>
              <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">Received (₹)</th>
              <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">Outstanding (₹)</th>
              <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap">Installments</th>
              <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap">Next Due Date</th>
              <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap">Overall Status</th>
              <th className="py-2.5 px-3 text-center font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {clientGroups.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                  No installment schedules found matching your filters.
                </td>
              </tr>
            ) : (
              clientGroups.map((client) => {
                const isClientExpanded = !!expandedClients[client.clientId];
                return (
                  <React.Fragment key={client.clientId}>
                    {/* Level 1: Single Client Row */}
                    <tr
                      onClick={() => toggleClient(client.clientId)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer bg-white"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500">
                            {isClientExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </span>
                          <Link
                            href={`/clients/${client.clientId}?tab=payments`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#0481A2] hover:underline"
                          >
                            {client.clientName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-xs text-slate-600">
                        {client.clientCode}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900">
                        {formatINR(client.totalPlan)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-emerald-700">
                        {formatINR(client.totalReceived)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-rose-600">
                        {formatINR(client.totalOutstanding)}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-slate-800">
                        {client.installmentCount}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-xs text-slate-600 whitespace-nowrap">
                        {client.nextDueDate || "—"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                            client.overallStatus
                          )}`}
                        >
                          {client.overallStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleClient(client.clientId)}
                          className="p-1.5 text-slate-500 hover:text-[#243E76] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title={isClientExpanded ? "Collapse" : "Expand Services"}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Level 2 & 3: Services -> Installments */}
                    {isClientExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={9} className="p-3 sm:p-4 space-y-3">
                          <div className="space-y-3">
                            {client.services.map((svc: any) => {
                              const isServiceExpanded = expandedServices[svc.serviceKey] !== false;
                              return (
                                <div
                                  key={svc.serviceKey}
                                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                                >
                                  {/* Service Header */}
                                  <div
                                    onClick={() => toggleService(svc.serviceKey)}
                                    className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-slate-500">
                                        {isServiceExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </span>
                                      <Briefcase size={14} className="text-[#0481A2]" />
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                        {svc.serviceName}
                                      </span>
                                      {svc.invoiceNumber && svc.invoiceId && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onPreviewInvoice(svc.invoiceId);
                                          }}
                                          className="px-2 py-0.5 rounded-md bg-sky-50 text-[#243E76] border border-sky-200 text-[11px] font-mono font-semibold hover:bg-sky-100 cursor-pointer"
                                        >
                                          Invoice: {svc.invoiceNumber}
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                      <span className="font-mono font-semibold text-slate-800">
                                        {formatINR(svc.totalScheduled)}
                                      </span>
                                      <span className="font-mono font-bold text-emerald-700">
                                        {formatINR(svc.received)}
                                      </span>
                                      <span className="font-mono font-bold text-rose-600">
                                        {formatINR(svc.outstanding)}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                                          svc.status
                                        )}`}
                                      >
                                        {svc.status}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Level 3: Installment Rows */}
                                  {isServiceExpanded && (
                                    <div className="p-3">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                          <thead>
                                            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                                              <th className="py-2 px-2 w-10">#</th>
                                              <th className="py-2 px-2">Installment Title</th>
                                              <th className="py-2 px-2 whitespace-nowrap">Due Date</th>
                                              <th className="py-2 px-2 text-right whitespace-nowrap">Target Amount (₹)</th>
                                              <th className="py-2 px-2 text-right whitespace-nowrap">Received (₹)</th>
                                              <th className="py-2 px-2 text-right whitespace-nowrap">Balance (₹)</th>
                                              <th className="py-2 px-2 w-32">Progress</th>
                                              <th className="py-2 px-2 text-center">Status</th>
                                              <th className="py-2 px-2 text-center">Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {svc.items.map((inst: any, idx: number) => {
                                              const target = Number(inst.amount) || 0;
                                              const rec = Number(inst.amountPaid ?? inst.amount_paid) || 0;
                                              const bal = Math.max(0, target - rec);
                                              const pct = target > 0 ? Math.min(100, Math.round((rec / target) * 100)) : 0;
                                              return (
                                                <tr key={inst.id} className="hover:bg-slate-50/60">
                                                  <td className="py-2 px-2 font-mono text-slate-500">
                                                    {inst.installmentNumber || idx + 1}
                                                  </td>
                                                  <td className="py-2 px-2 font-medium text-slate-900">
                                                    {inst.title}
                                                  </td>
                                                  <td className="py-2 px-2 font-mono text-slate-600 whitespace-nowrap">
                                                    {inst.dueDate}
                                                  </td>
                                                  <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900">
                                                    {formatINR(target)}
                                                  </td>
                                                  <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">
                                                    {formatINR(rec)}
                                                  </td>
                                                  <td className="py-2 px-2 text-right font-mono font-bold text-rose-600">
                                                    {formatINR(bal)}
                                                  </td>
                                                  <td className="py-2 px-2">
                                                    <div className="flex items-center gap-1.5">
                                                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                          className="h-full bg-emerald-500 rounded-full"
                                                          style={{ width: `${pct}%` }}
                                                        />
                                                      </div>
                                                      <span className="text-[10px] font-mono text-slate-500 w-7 text-right">
                                                        {pct}%
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-2 text-center">
                                                    <span
                                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                                                        inst.status
                                                      )}`}
                                                    >
                                                      {inst.status}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-2">
                                                    <div className="flex items-center justify-center gap-1">
                                                      {bal > 0.009 && (
                                                        <button
                                                          onClick={() => onPayInstallment(inst)}
                                                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                                                        >
                                                          <IndianRupee size={10} />
                                                          <span>Pay</span>
                                                        </button>
                                                      )}
                                                      <button
                                                        onClick={() => onViewInstallment(inst)}
                                                        className="p-1 text-slate-400 hover:text-[#243E76] rounded cursor-pointer"
                                                        title="View"
                                                      >
                                                        <Eye size={13} />
                                                      </button>
                                                      <button
                                                        onClick={() => onEditInstallment(inst)}
                                                        className="p-1 text-slate-400 hover:text-[#0481A2] rounded cursor-pointer"
                                                        title="Edit"
                                                      >
                                                        <Pencil size={13} />
                                                      </button>
                                                      <button
                                                        onClick={() => onDeleteInstallment(inst)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                                        title="Delete"
                                                      >
                                                        <Trash2 size={13} />
                                                      </button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      {onAddNextInstallment && (
                                        <div className="mt-2.5 flex justify-end">
                                          <button
                                            onClick={() => onAddNextInstallment(client.clientId, svc.serviceId)}
                                            className="px-3 py-1.5 rounded-lg bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                          >
                                            <Plus size={13} />
                                            <span>Add Next Installment</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
