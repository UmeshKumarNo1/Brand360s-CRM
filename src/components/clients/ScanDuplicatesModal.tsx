"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  ScanSearch,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
} from "lucide-react";
import {
  scanDatabaseDuplicatesAction,
  DuplicateGroup,
} from "@/app/actions/duplicate-detection";

interface ScanDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScanDuplicatesModal({ isOpen, onClose }: ScanDuplicatesModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "email" | "phone" | "companyName">("all");

  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await scanDatabaseDuplicatesAction();
      setTotalClients(res.totalClients);
      setGroups(res.groups);
      setHasScanned(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  const filteredGroups = groups.filter((g) => {
    if (selectedFilter === "all") return true;
    return g.reason === selectedFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#243E76]/10 text-[#243E76]">
              <ScanSearch size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Duplicate Client Detection Utility
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan all clients in BRAND 360s CRM to detect identical or matching records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {!hasScanned && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0481A2] mx-auto flex items-center justify-center">
                <ScanSearch size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-slate-900">Run Duplicate Diagnostic</h4>
                <p className="text-xs text-slate-500">
                  This utility performs case-insensitive email comparison, 10-digit normalized phone matching, and suffix-stripped company name comparison across both active and archived client records.
                </p>
              </div>
              <button
                onClick={runScan}
                disabled={isScanning}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Scanning Database...</span>
                  </>
                ) : (
                  <>
                    <ScanSearch size={16} />
                    <span>Start Duplicate Scan</span>
                  </>
                )}
              </button>
            </div>
          )}

          {hasScanned && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex-wrap gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Total Database Clients:</span>{" "}
                    <strong className="text-slate-900">{totalClients}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Duplicate Sets Identified:</span>{" "}
                    <strong className={groups.length > 0 ? "text-amber-600 font-bold" : "text-emerald-600"}>
                      {groups.length}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={runScan}
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                  >
                    {isScanning ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />}
                    <span>Rescan</span>
                  </button>
                </div>
              </div>

              {groups.length > 0 && (
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 mr-2">Filter By:</span>
                  {(["all", "email", "phone", "companyName"] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setSelectedFilter(filterKey)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer capitalize ${
                        selectedFilter === filterKey
                          ? "bg-[#243E76] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filterKey === "companyName" ? "Company" : filterKey}
                    </button>
                  ))}
                </div>
              )}

              {/* Group Results */}
              {groups.length === 0 ? (
                <div className="text-center py-10 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                  <ShieldCheck size={36} className="text-emerald-600 mx-auto" />
                  <h5 className="text-sm font-bold text-emerald-900">No Duplicates Found</h5>
                  <p className="text-xs text-emerald-700">All registered clients have unique emails, phone numbers, and company names.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGroups.map((g, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                    >
                      <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {g.reason === "companyName" ? "Company Name" : g.reason} Match
                          </span>
                          <span className="font-semibold text-slate-900 font-mono text-[11px]">
                            {g.value}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px] font-medium">
                          {g.clients.length} duplicate records
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {g.clients.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-xs flex-wrap gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{c.companyName}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                                  {c.clientCode}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                    c.clientStatus === "Active"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-purple-50 text-purple-700"
                                  }`}
                                >
                                  {c.clientStatus}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User size={11} /> {c.contactPerson || "No contact"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail size={11} /> {c.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {c.phone}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Salesperson</span>
                                <span className="font-medium text-slate-700 text-[11px]">
                                  {c.assignedSalespersonName}
                                </span>
                              </div>
                              <Link
                                href={`/clients/${c.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0481A2] hover:bg-sky-50 rounded-lg transition-colors"
                              >
                                <span>Inspect</span>
                                <ExternalLink size={12} />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Utility
          </button>
        </div>
      </div>
    </div>
  );
}

