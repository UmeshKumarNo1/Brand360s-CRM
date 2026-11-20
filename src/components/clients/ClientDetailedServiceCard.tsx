"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Plus,
  Eye,
  Download,
  Calendar,
  Layers,
  Shield,
  FileCheck,
  Globe,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Tag,
  User,
  ExternalLink,
  Trash2,
  FolderOpen,
  Award,
  Edit,
  RotateCcw,
  Check,
  Zap,
  Paperclip,
  Upload,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { DetailedServiceData } from "@/app/actions/client-detailed-services";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { ServiceFulfillmentTimeline } from "@/components/services/ServiceFulfillmentTimeline";
import { InlineAssignEmployeeCell } from "@/components/services/InlineAssignEmployeeCell";
import { TargetDateCell } from "@/components/services/TargetDateCell";
import { PortalDropdown } from "@/components/common/PortalDropdown";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
    if (norm.includes("web") || norm.includes("app") || norm.includes("software")) {
      return Globe;
    }
    if (norm.includes("incorporat") || norm.includes("company") || norm.includes("pvt ltd")) {
      return Layers;
    }
    return Briefcase;
  };

  const ServiceIcon = getServiceIcon(service.serviceName, service.serviceCategory);
  const isCompleted = service.serviceStatus === "Completed";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* 1. Service Card Header matching Reference Image 1 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-all select-none"
      >
        {/* Left Section: Icon, Title, Subtitle, Sequence Pill */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Service Icon in soft cyan box */}
          <div className="w-11 h-11 rounded-2xl bg-[#E0F7FA] text-[#0481A2] border border-[#B2EBF2]/40 flex items-center justify-center shrink-0 shadow-2xs">
            <ServiceIcon size={20} />
          </div>

          {/* Title, Subtitle & Sequence Pill */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/services/${service.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-slate-900 text-sm tracking-tight truncate hover:text-[#0481A2] hover:underline cursor-pointer inline-flex items-center gap-1.5 group text-left"
                title={`Open ${service.serviceName} service detail page`}
              >
                <span>{service.serviceName}</span>
                <ExternalLink size={13} className="text-slate-400 group-hover:text-[#0481A2] shrink-0" />
              </Link>
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8FA] text-[#0481A2] border border-[#BDE8EF] shrink-0">
                <span>Service {index + 1} of {totalServices}</span>
                <ChevronDown size={11} className={cn("transition-transform", isExpanded && "rotate-180")} />
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{service.serviceCategory}</p>
          </div>
        </div>

        {/* Middle Section: Financial Metrics with Vertical Dividers */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Contract Value</span>
            <span className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.contractValue)}</span>
          </div>

          <div className="h-7 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Invoiced</span>
            <span className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.invoicedAmount)}</span>
          </div>

          <div className="h-7 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Collected</span>
            <span className="font-bold text-emerald-600 text-sm font-sans font-number">{formatINR(service.collectedAmount)}</span>
          </div>

          <div className="h-7 w-[1px] bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Outstanding</span>
            <span className="font-bold text-rose-600 text-sm font-sans font-number">{formatINR(service.outstandingAmount)}</span>
          </div>
        </div>

        {/* Right Section: Status Pills matching Reference Image 1 */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Payment Status Pill */}
          {service.paymentStatus === "Paid" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Check size={12} className="text-emerald-600" />
              <span>PAID</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 shadow-2xs">
              <RotateCcw size={12} className="text-slate-500" />
              <span>UNPAID</span>
            </span>
          )}

          {/* Fulfillment Status Button / Pill */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-2xs",
              isCompleted
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#00607A] hover:bg-[#004D61]"
            )}
          >
            <Check size={12} className="text-white" />
            <span>{isCompleted ? "Completed" : "Pending"}</span>
          </span>

          {/* Dropdown Menu for Management Actions */}
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
              title="Service Actions"
            >
              <MoreVertical size={16} />
            </button>

            <PortalDropdown
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              triggerRef={menuButtonRef}
              minWidth={210}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onManageService?.(service);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-xs"
              >
                <FolderOpen size={14} className="text-slate-400" />
                <span>View Documents &amp; Details</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEditService?.(service);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-[#0481A2] text-xs"
                >
                  <Edit size={14} className="text-[#0481A2]" />
                  <span>Edit Service Deliverable</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onManageStage?.(service.id);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-xs"
              >
                <Award size={14} className="text-slate-400" />
                <span>Manage Fulfillment Stage</span>
              </button>

              {isAdmin && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteService?.(service);
                    }}
                    className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer text-xs"
                  >
                    <Trash2 size={14} className="text-rose-600" />
                    <span>Delete Service</span>
                  </button>
                </>
              )}
            </PortalDropdown>
          </div>
        </div>
      </div>

      {/* 2. Expanded Body Section matching Reference Image 1 exactly */}
      {isExpanded && (
        <div className="p-5 sm:p-6 bg-[#F4F8FC]/50 space-y-5 rounded-b-2xl">
          {/* Main 3-Column Layout: Standalone Crisp White Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* 1. Left Column: Service & Commercial Details (3.5 Cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <FileText size={16} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900 text-sm">Service &amp; Commercial Details</h4>
                </div>

                <div className="space-y-2.5 pt-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Service</span>
                    <strong className="text-slate-900 font-semibold truncate text-right">{service.serviceName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Category</span>
                    <span className="text-slate-700 truncate text-right">{service.serviceCategory}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Service Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.serviceFee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Govt Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.govtFee)}</span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">Total Value</span>
                    <strong className="font-bold text-slate-900 text-base font-sans font-number">{formatINR(service.totalAmount)}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs shrink-0">Assigned To</span>
                  <InlineAssignEmployeeCell
                    serviceId={service.id}
                    clientId={service.clientId}
                    assignedEmployeeId={service.assignedEmployeeId}
                    assignedEmployeeName={service.assignedEmployeeName}
                    editable={canEdit}
                    onUpdated={() => onRefresh?.()}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs shrink-0">Target Date</span>
                  <TargetDateCell
                    serviceId={service.id}
                    clientId={service.clientId}
                    initialDate={service.expectedCompletionDate}
                    isCompleted={service.serviceStatus === "Completed"}
                    editable={canEdit}
                    onDateUpdated={() => onRefresh?.()}
                  />
                </div>
              </div>
            </div>

            {/* 2. Center Column: Fulfilment Progress (Row 1) & Invoices + Documents (Row 2) (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-5">
              {/* Row 1: Fulfilment Progress Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-sm">Fulfilment Progress</h4>
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
                <div className="py-2 px-1 sm:px-2">
                  <ServiceFulfillmentTimeline
                    stages={fulfillment.stages}
                    currentStageName={fulfillment.currentStageName}
                    progressPercentage={fulfillment.progressPercentage}
                    size="md"
                  />
                </div>

                {/* Progress Summary Footer Bar */}
                <div className="text-xs text-slate-500 pt-1">
                  <span>Current Stage: <strong className="text-slate-800">{fulfillment.currentStageName}</strong></span>
                </div>
              </div>

              {/* Row 2: Invoices (Col 1) & Documents (Col 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* D. Invoice & Payment History */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText size={15} className="text-[#0481A2] shrink-0" />
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Invoice &amp; Payment History</h4>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-[#0481A2] hover:underline font-semibold cursor-pointer shrink-0 inline-flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 max-h-[145px] overflow-y-auto">
                      {service.invoices.length === 0 && service.payments.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No invoices or payments logged yet.</p>
                      ) : (
                        <>
                          {service.invoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="py-2 px-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
                                  <FileText size={14} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate text-xs">{inv.invoiceNumber}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {inv.issueDate} • Due: {inv.dueDate}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <strong className="font-bold text-slate-900 font-sans font-number text-xs">{formatINR(inv.totalAmount)}</strong>
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
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
                          ))}

                          {service.payments.map((p) => (
                            <div
                              key={p.id}
                              className="py-2 px-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                  <CreditCard size={14} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate text-xs">{p.paymentNumber}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {p.paymentDate} • {p.paymentMethod}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <strong className="font-bold text-emerald-700 font-sans font-number text-xs">{formatINR(p.allocatedAmount)}</strong>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Received
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* E. Documents (0) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Paperclip size={15} className="text-[#0481A2]" />
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Documents ({service.documents.length})</h4>
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

                    <div className="space-y-2 pt-2 max-h-[145px] overflow-y-auto">
                      {service.documents.length === 0 ? (
                        <div className="py-4 px-3 text-center space-y-2 flex flex-col items-center justify-center">
                          <FolderOpen size={28} className="text-slate-300" strokeWidth={1.5} />
                          <p className="text-xs text-slate-400">No documents uploaded</p>
                          <button
                            type="button"
                            onClick={() => onAddDocument?.(service.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#0481A2] border border-[#0481A2] rounded-full hover:bg-sky-50 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Upload size={12} />
                            <span>Upload Document</span>
                          </button>
                        </div>
                      ) : (
                        service.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="py-1.5 px-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
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
            <div className="lg:col-span-3 flex flex-col justify-between gap-5">
              {/* Payment Summary (Standalone White Card) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <CreditCard size={16} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-sm">Payment Summary</h4>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex items-baseline justify-between text-xs text-slate-500">
                      <span>Paid Amount</span>
                      <span className="font-bold text-slate-700 font-sans font-number">{service.paymentProgress}%</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 font-sans font-number">
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

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Outstanding</span>
                  <strong className="font-bold font-sans font-number text-sm text-rose-600">
                    {formatINR(service.outstandingAmount)}
                  </strong>
                </div>
              </div>

              {/* Next Action (Standalone White Card) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    <h4 className="font-bold text-slate-900 text-sm">Next Action</h4>
                  </div>

                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl bg-[#FEFCE8] border border-[#FEF08A] flex items-start gap-2.5">
                      <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs leading-snug min-w-0">
                        <p className="font-semibold text-amber-950 truncate">
                          {service.nextAction.title || `Collect payment of ${formatINR(service.outstandingAmount || service.contractValue)}`}
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1">Due: {service.nextAction.dueDate}</p>
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
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#0481A2]" />
                <h4 className="font-bold text-slate-900 text-sm">Service Activity</h4>
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
                {service.activities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No activity recorded for this service yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {service.activities.map((act) => (
                      <div key={act.id} className="relative text-xs flex items-start gap-4">
                        {/* Node Dot */}
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#0481A2] ring-4 ring-white" />
                        <div className="min-w-[100px] text-xs text-slate-400 font-sans font-number">
                          {new Date(act.timestamp).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex-1">
                          <strong className="text-slate-900 font-semibold block text-xs">{act.title}</strong>
                          <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{act.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Laptop with </> & Potted Plant Illustration matching Reference Image 1 */}
              <div className="hidden lg:flex items-center justify-end shrink-0 pr-4 select-none pointer-events-none">
                <svg width="220" height="110" viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Laptop Base */}
                  <path d="M20 90H170C173 90 175 92 173 95L168 98C167 99 165 99 163 99H27C25 99 23 99 22 98L17 95C15 92 17 90 20 90Z" fill="#CBD5E1"/>
                  <rect x="75" y="90" width="40" height="3" rx="1.5" fill="#94A3B8"/>
                  {/* Laptop Screen Frame */}
                  <rect x="35" y="25" width="120" height="65" rx="6" fill="#1E293B"/>
                  {/* Screen Inner */}
                  <rect x="39" y="29" width="112" height="57" rx="3" fill="#0F172A"/>
                  <rect x="42" y="32" width="106" height="51" rx="2" fill="#F8FAFC"/>
                  {/* Code icon on screen </> */}
                  <path d="M86 52L80 57.5L86 63" stroke="#0481A2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M104 52L110 57.5L104 63" stroke="#0481A2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M97 49L93 66" stroke="#0481A2" strokeWidth="2" strokeLinecap="round"/>
                  {/* Potted Plant */}
                  {/* Pot */}
                  <path d="M185 85L188 100H202L205 85H185Z" fill="#E2E8F0"/>
                  <path d="M184 83H206V85H184V83Z" fill="#CBD5E1"/>
                  {/* Leaves */}
                  <path d="M195 83C195 72 188 68 185 68C188 75 192 80 195 83Z" fill="#10B981"/>
                  <path d="M195 83C195 70 202 65 206 66C203 74 198 80 195 83Z" fill="#059669"/>
                  <path d="M195 83C195 62 192 55 195 52C198 58 198 72 195 83Z" fill="#34D399"/>
                  <path d="M195 83C192 76 182 78 180 75C186 78 192 81 195 83Z" fill="#10B981"/>
                  <path d="M195 83C198 76 208 78 210 75C204 78 198 81 195 83Z" fill="#059669"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
