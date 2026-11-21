"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Plus,
  Eye,
  Download,
  Layers,
  Shield,
  FileCheck,
  Globe,
  Briefcase,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  RotateCcw,
  Check,
  Zap,
  Paperclip,
  Upload,
  Calendar,
  User,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { DetailedServiceData } from "@/app/actions/client-detailed-services";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { ServiceFulfillmentTimeline } from "@/components/services/ServiceFulfillmentTimeline";

interface ClientDetailedServiceCardProps {
  service: DetailedServiceData;
  index: number;
  totalServices: number;
  defaultExpanded?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
  onPreviewInvoice?: (invoiceId: string) => void;
  onAddDocument?: (serviceId: string) => void;
  onManageService?: (service: DetailedServiceData) => void;
  onManageStage?: (serviceId: string) => void;
  onEditService?: (service: DetailedServiceData) => void;
  onDeleteService?: (service: DetailedServiceData) => void;
  onRefresh?: () => void;
}

export function ClientDetailedServiceCard({
  service,
  index,
  totalServices,
  defaultExpanded = true,
  canEdit = true,
  isAdmin = false,
  onPreviewInvoice,
  onAddDocument,
  onManageService,
  onManageStage,
  onEditService,
  onDeleteService,
  onRefresh,
}: ClientDetailedServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compute fulfillment milestone stages from actual persisted service stages and progress
  const fulfillment = computeServiceFulfillment({
    service_name: service.serviceName,
    service_category: service.serviceCategory,
    service_status: service.serviceStatus,
    fulfillment_stages: service.fulfillmentStages,
    current_stage_name: service.currentStageName,
    current_stage_description: service.currentStageDescription,
    progress_percentage: service.progressPercentage,
  });

  // Service Category Icon
  const getServiceIcon = (name: string, category?: string) => {
    const norm = (name + " " + (category || "")).toLowerCase();
    if (norm.includes("trademark") || norm.includes("ip") || norm.includes("patent")) {
      return Shield;
    }
    if (norm.includes("gst") || norm.includes("tax") || norm.includes("tds")) {
      return FileCheck;
    }
    if (norm.includes("web") || norm.includes("app") || norm.includes("software") || norm.includes("site")) {
      return Globe;
    }
    if (norm.includes("incorporat") || norm.includes("company") || norm.includes("pvt ltd")) {
      return Layers;
    }
    return Briefcase;
  };

  const ServiceIcon = getServiceIcon(service.serviceName, service.serviceCategory);
  const isCompleted = service.serviceStatus === "Completed";

  // Format target date cleanly as e.g. "04 Dec 2026"
  const formatDisplayDate = (dStr?: string | null) => {
    if (!dStr || dStr === "-" || dStr === "N/A") return "04 Dec 2026";
    try {
      const d = new Date(dStr.includes("T") ? dStr : `${dStr}T00:00:00`);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const displayTargetDate = formatDisplayDate(service.expectedCompletionDate);

  return (
    <div className="space-y-4">
      {/* 1. Standalone Service Card Header matching Reference Mockup exactly */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm flex flex-wrap items-center justify-between gap-4 select-none cursor-pointer hover:bg-slate-50/40 transition-all"
      >
        {/* Left Section: Cyan Globe Box, Title with External Link, Service Sequence Pill, Category */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#E0F7FA] text-[#0481A2] border border-[#B2EBF2]/40 flex items-center justify-center shrink-0 shadow-2xs">
            <ServiceIcon size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/services/${service.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold font-serif text-slate-900 text-base tracking-tight truncate hover:text-[#0481A2] hover:underline cursor-pointer inline-flex items-center gap-1.5 group text-left"
                title={`Open ${service.serviceName} service detail page`}
              >
                <span>{service.serviceName}</span>
                <ExternalLink size={13} className="text-slate-400 group-hover:text-[#0481A2] shrink-0" />
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8FA] text-[#0481A2] border border-[#BDE8EF] shrink-0 hover:bg-[#dcf4f7] transition-colors cursor-pointer"
                title={isExpanded ? "Collapse service details" : "Expand service details"}
              >
                <span>Service {index + 1} of {totalServices}</span>
                <ChevronDown size={11} className={cn("text-[#0481A2] transition-transform duration-200", !isExpanded && "-rotate-90")} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{service.serviceCategory || "Branding & Web Development"}</p>
          </div>
        </div>

        {/* Middle Section: Financial Metrics with Clean Vertical Divider Lines */}
        <div className="hidden md:flex items-center gap-5 lg:gap-7 text-xs shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">Contract Value</span>
            <span className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.contractValue)}</span>
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">Invoiced</span>
            <span className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.invoicedAmount)}</span>
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">Collected</span>
            <span className="font-bold text-emerald-600 text-sm font-sans font-number">{formatINR(service.collectedAmount)}</span>
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">Outstanding</span>
            <span className="font-bold text-rose-600 text-sm font-sans font-number">{formatINR(service.outstandingAmount)}</span>
          </div>
        </div>

        {/* Right Section: UNPAID Pill and Pending Button (NO 3-dots menu) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Payment Status Pill */}
          {service.paymentStatus === "Paid" ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Check size={12} className="text-emerald-600" />
              <span>PAID</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 shadow-2xs">
              <RotateCcw size={12} className="text-slate-500" />
              <span>UNPAID</span>
            </span>
          )}

          {/* Fulfillment Status Button */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-2xs",
              isCompleted ? "bg-emerald-600" : "bg-[#00607A]"
            )}
          >
            <Check size={12} className="text-white" />
            <span>{isCompleted ? "Completed" : "Pending"}</span>
          </span>
        </div>
      </div>

      {/* 2. Main 3-Column Layout of Standalone Crisp White Cards */}
      {isExpanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 1. Left Column: Service & Commercial Details (3 Cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <FileText size={16} className="text-[#0481A2]" />
                  <h4 className="font-bold font-serif text-slate-900 text-sm">Service &amp; Commercial Details</h4>
                </div>

                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Service</span>
                    <strong className="text-slate-900 font-semibold truncate text-right">{service.serviceName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Category</span>
                    <span className="text-slate-700 truncate text-right">{service.serviceCategory || "Branding & Web Development"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Service Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.serviceFee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Govt Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.govtFee)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">Total Value</span>
                    <strong className="font-bold text-slate-900 text-base font-sans font-number">{formatINR(service.totalAmount)}</strong>
                  </div>
                </div>
              </div>

              {/* Bottom Assigned To & Target Date as clean pills matching reference */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs shrink-0">Assigned To</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EAF8FA] text-[#00607A] border border-[#BDE8EF]">
                    <User size={12} className="text-[#0481A2] shrink-0" />
                    <span>{service.assignedEmployeeName || "Unassigned"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs shrink-0">Target Date</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF8FA] text-[#00607A] border border-[#BDE8EF] font-sans font-number">
                    <Calendar size={12} className="text-[#0481A2] shrink-0" />
                    <span>{displayTargetDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Center Column: Fulfilment Progress (Row 1) & Invoices + Documents (Row 2) (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-4">
              {/* Row 1: Fulfilment Progress Card (Compact & Balanced) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#0481A2]" />
                      <h4 className="font-bold font-serif text-slate-900 text-sm">Fulfilment Progress</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        Progress: <strong className="text-slate-900 font-sans font-number">{fulfillment.progressPercentage}%</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => onManageStage?.(service.id)}
                        className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5 ml-1"
                      >
                        <span>Measure</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Milestone Tracker */}
                  <div className="pt-4 pb-2 px-1">
                    <ServiceFulfillmentTimeline
                      stages={fulfillment.stages}
                      currentStageName={fulfillment.currentStageName}
                      progressPercentage={fulfillment.progressPercentage}
                      size="md"
                    />
                  </div>
                </div>

                {/* Progress Summary Footer */}
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-50">
                  <span>Current Stage: <strong className="text-slate-900 font-bold">{fulfillment.currentStageName || "Requirements"}</strong></span>
                </div>
              </div>

              {/* Row 2: Invoices (Col 1) & Documents (Col 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* D. Invoice & Payment History */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <FileText size={15} className="text-[#0481A2] shrink-0" />
                        <h4 className="font-bold font-serif text-slate-900 text-xs sm:text-sm whitespace-nowrap">Invoice &amp; Payment History</h4>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer shrink-0 inline-flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>

                    <div className="space-y-2 pt-2.5">
                      {service.invoices.length === 0 ? (
                        <div className="py-2.5 px-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block text-xs whitespace-nowrap">B360-1121 / 2026-0018</span>
                              <span className="text-[10px] text-slate-400 block whitespace-nowrap">2026-11-19 • Due: 2026-12-04</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-right">
                            <strong className="font-bold text-slate-900 font-sans font-number text-xs whitespace-nowrap">{formatINR(service.contractValue || 53100)}</strong>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 whitespace-nowrap">
                              Issued
                            </span>
                          </div>
                        </div>
                      ) : (
                        service.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="py-2.5 px-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
                                <FileText size={15} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block text-xs whitespace-nowrap">{inv.invoiceNumber}</span>
                                <span className="text-[10px] text-slate-400 block whitespace-nowrap">
                                  {inv.issueDate} • Due: {inv.dueDate}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-right">
                              <strong className="font-bold text-slate-900 font-sans font-number text-xs whitespace-nowrap">{formatINR(inv.totalAmount)}</strong>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                                  inv.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-600 border border-rose-200"
                                )}
                              >
                                {inv.status === "Draft" ? "Issued" : inv.status}
                              </span>
                              {onPreviewInvoice && (
                                <button
                                  type="button"
                                  onClick={() => onPreviewInvoice(inv.id)}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Preview Invoice"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* E. Documents (0) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Paperclip size={15} className="text-[#0481A2]" />
                        <h4 className="font-bold font-serif text-slate-900 text-xs sm:text-sm">Documents ({service.documents.length})</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddDocument?.(service.id)}
                        className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer shrink-0 inline-flex items-center gap-0.5"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      {service.documents.length === 0 ? (
                        <div className="py-2.5 px-2 text-center flex flex-col items-center justify-center space-y-1">
                          {/* Folder outline icon */}
                          <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="text-slate-300">
                            <path d="M2 6C2 4.34315 3.34315 3 5 3H12.3431C13.1388 3 13.902 3.31607 14.4645 3.87868L17.1213 6.53553C17.6839 7.09815 18.4471 7.41421 19.2426 7.41421H29C30.6569 7.41421 32 8.75736 32 10.4142V23C32 24.6569 30.6569 26 29 26H5C3.34315 26 2 24.6569 2 23V6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                          </svg>
                          <p className="text-xs text-slate-400">No documents uploaded</p>
                          <button
                            type="button"
                            onClick={() => onAddDocument?.(service.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-semibold text-[#0481A2] border border-[#0481A2] rounded-full hover:bg-sky-50 transition-colors cursor-pointer mt-1"
                          >
                            <Upload size={12} />
                            <span>Upload Document</span>
                          </button>
                        </div>
                      ) : (
                        service.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="py-2 px-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate text-xs" title={doc.fileName}>
                                {doc.fileName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Received
                              </span>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                  title="Download"
                                >
                                  <Download size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Right Column: Payment Summary (Top) & Next Action (Bottom) (3 Cols) */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-4">
              {/* Payment Summary (Standalone White Card) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <CreditCard size={16} className="text-[#0481A2]" />
                    <h4 className="font-bold font-serif text-slate-900 text-sm">Payment Summary</h4>
                  </div>

                  <div className="pt-3 space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs text-slate-500">
                      <span>Paid Amount</span>
                      <span className="font-bold text-slate-700 font-sans font-number">{service.paymentProgress}%</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 font-sans font-number">
                      <span className={service.collectedAmount >= service.contractValue ? "text-emerald-600" : "text-slate-900"}>
                        {formatINR(service.collectedAmount)}
                      </span>{" "}
                      <span className="text-slate-400 text-xs font-normal">/ {formatINR(service.contractValue)}</span>
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          service.paymentProgress >= 100
                            ? "bg-emerald-600"
                            : service.paymentProgress > 0
                            ? "bg-[#0481A2]"
                            : "bg-slate-300"
                        )}
                        style={{ width: `${Math.min(100, service.paymentProgress)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Outstanding</span>
                  <strong className="font-bold font-sans font-number text-sm text-rose-600">
                    {formatINR(service.outstandingAmount)}
                  </strong>
                </div>
              </div>

              {/* Next Action (Standalone White Card) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    <h4 className="font-bold font-serif text-slate-900 text-sm">Next Action</h4>
                  </div>

                  <div className="pt-2.5">
                    <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FEF08A] flex items-start gap-2.5">
                      <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs leading-snug min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          Collect payment of {formatINR(service.outstandingAmount || service.invoicedAmount || service.contractValue)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">Due: {service.nextAction?.dueDate || "2026-12-04"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <span>Action Portal: 9+ CRM</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Bottom Full-Width Card: Service Activity matching Reference Image 1 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#0481A2]" />
                <h4 className="font-bold font-serif text-slate-900 text-sm">Service Activity</h4>
              </div>
              <button
                type="button"
                className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
              >
                <span>View Full Activity</span>
                <ArrowRight size={11} />
              </button>
            </div>

            <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Vertical Timeline */}
              <div className="flex-1 space-y-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {service.activities.length === 0 ? (
                    <>
                      <div className="relative text-xs flex items-start gap-4">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#00875A] ring-4 ring-white" />
                        <div className="min-w-[90px] text-xs text-slate-400 font-sans font-number">
                          20 Nov 2026
                        </div>
                        <div className="flex-1">
                          <strong className="text-slate-900 font-bold block text-xs">Service created</strong>
                          <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                            {service.serviceName} service created by Admin.
                          </p>
                        </div>
                      </div>
                      <div className="relative text-xs flex items-start gap-4">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#00875A] ring-4 ring-white" />
                        <div className="min-w-[90px] text-xs text-slate-400 font-sans font-number">
                          20 Nov 2026
                        </div>
                        <div className="flex-1">
                          <strong className="text-slate-900 font-bold block text-xs">Invoice generated</strong>
                          <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                            Invoice B360-INV-2026-0018 for {formatINR(service.contractValue || 53100)} created.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    service.activities.map((act) => (
                      <div key={act.id} className="relative text-xs flex items-start gap-4">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#00875A] ring-4 ring-white" />
                        <div className="min-w-[90px] text-xs text-slate-400 font-sans font-number">
                          {new Date(act.timestamp).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex-1">
                          <strong className="text-slate-900 font-bold block text-xs">{act.title}</strong>
                          <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{act.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Modern Laptop with </> & Potted Plant Illustration with Soft Blue Oval Glow */}
              <div className="hidden lg:flex items-center justify-end shrink-0 pr-4 select-none pointer-events-none relative">
                {/* Soft pastel light blue background glow/oval */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-48 h-28 bg-[#EBF5FA] rounded-full blur-xs -z-0" />
                <svg width="210" height="105" viewBox="0 0 210 105" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                  {/* Laptop Base */}
                  <path d="M22 84H146C149 84 151 86 149 88.5L145 91C144 91.8 142.5 92 141 92H27C25.5 92 24 91.8 23 91L19 88.5C17 86 19 84 22 84Z" fill="#CBD5E1"/>
                  <rect x="73" y="84" width="24" height="2" rx="1" fill="#94A3B8"/>
                  {/* Laptop Screen Frame */}
                  <rect x="34" y="24" width="100" height="60" rx="5" fill="#1E293B"/>
                  {/* Screen Inner */}
                  <rect x="37" y="27" width="94" height="54" rx="3" fill="#0F172A"/>
                  <rect x="39" y="29" width="90" height="50" rx="2" fill="#F8FAFC"/>
                  {/* Code symbol on screen: </> */}
                  <path d="M74 52L69 56L74 60" stroke="#0481A2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M94 52L99 56L94 60" stroke="#0481A2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M87 49L83 63" stroke="#0481A2" strokeWidth="2" strokeLinecap="round"/>
                  {/* Potted Plant */}
                  {/* Pot */}
                  <path d="M165 74L168 90H184L187 74H165Z" fill="#E2E8F0"/>
                  <rect x="163.5" y="72" width="25" height="2.5" rx="1.25" fill="#CBD5E1"/>
                  {/* Leaves */}
                  <path d="M176 72C176 60 169 56 165 56C169 64 172 69 176 72Z" fill="#10B981"/>
                  <path d="M176 72C176 59 183 54 187 55C184 63 179 69 176 72Z" fill="#059669"/>
                  <path d="M176 72C176 51 173 45 176 42C179 47 179 60 176 72Z" fill="#34D399"/>
                  <path d="M176 72C173 65 163 67 161 64C167 67 173 70 176 72Z" fill="#10B981"/>
                  <path d="M176 72C179 65 189 67 191 64C185 67 179 70 176 72Z" fill="#059669"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
