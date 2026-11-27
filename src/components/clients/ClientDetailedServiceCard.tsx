"use client";

import { useState, useRef, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { DetailedServiceData } from "@/app/actions/client-detailed-services";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { ServiceFulfillmentTimeline } from "@/components/services/ServiceFulfillmentTimeline";
import { InlineAssignEmployeeCell } from "@/components/services/InlineAssignEmployeeCell";
import { TargetDateCell } from "@/components/services/TargetDateCell";
import { PortalDropdown } from "@/components/common/PortalDropdown";
import { ServiceFinancialHistoryModal } from "@/components/services/ServiceFinancialHistoryModal";
import { ServiceActivityHistoryModal } from "@/components/services/ServiceActivityHistoryModal";
import { deleteClientDocumentAction } from "@/app/actions/documents";
import { useToast } from "@/components/common/ToastProvider";

interface ClientDetailedServiceCardProps {
  service: DetailedServiceData;
  index: number;
  totalServices: number;
  defaultExpanded?: boolean;
  isSelected?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
  clientName?: string;
  onPreviewInvoice?: (invoiceId: string) => void;
  onAddDocument?: (serviceId: string) => void;
  onManageService?: (service: DetailedServiceData) => void;
  onManageStage?: (serviceId: string) => void;
  onEditService?: (service: DetailedServiceData) => void;
  onDeleteService?: (service: DetailedServiceData) => void;
  onCreateInvoice?: (service: DetailedServiceData) => void;
  onViewAllInvoices?: (service: DetailedServiceData) => void;
  onViewFullActivity?: (service: DetailedServiceData) => void;
  onRefresh?: () => void;
}

export function ClientDetailedServiceCard({
  service,
  index,
  totalServices,
  defaultExpanded = true,
  isSelected = false,
  canEdit = true,
  isAdmin = false,
  clientName,
  onPreviewInvoice,
  onAddDocument,
  onManageService,
  onManageStage,
  onEditService,
  onDeleteService,
  onCreateInvoice,
  onViewAllInvoices,
  onViewFullActivity,
  onRefresh,
}: ClientDetailedServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const handleDownloadDocument = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;
    setDeletingDocId(docId);
    try {
      const res = await deleteClientDocumentAction(docId, service.clientId);
      if (res.success) {
        success("Document Deleted", `${docName} has been deleted.`);
        if (onRefresh) onRefresh();
      } else {
        toastError("Delete Failed", res.error || "Could not delete document.");
      }
    } catch {
      toastError("Delete Failed", "An unexpected error occurred.");
    } finally {
      setDeletingDocId(null);
    }
  };

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

  // Status Badge Colors matching Reference Image
  const isCompleted = service.serviceStatus === "Completed";
  const statusBadge = isCompleted
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div
      id={`service-${service.id}`}
      className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition-all duration-300 scroll-mt-24 ${
        isSelected
          ? "border-[#0481A2] ring-2 ring-[#0481A2]/20 shadow-md"
          : "border-slate-200/90"
      }`}
    >
      {/* 1. Collapsible Service Header matching Reference Image 2 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-5 bg-gradient-to-r from-slate-50/80 via-white to-sky-50/40 border-b border-slate-100 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/90 transition-all select-none min-h-[76px]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Expand / Collapse Icon */}
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-slate-100/90 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 shadow-2xs"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Service Icon */}
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#077EA1] border border-sky-100 flex items-center justify-center shrink-0 shadow-2xs">
            <ServiceIcon size={20} />
          </div>

          {/* Title & Service Sequence Number */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/services/${service.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-slate-900 text-sm tracking-tight truncate hover:text-[#0481A2] hover:underline cursor-pointer inline-flex items-center gap-1.5 group text-left"
                title={`Open ${service.serviceName} service detail page`}
              >
                <span>{service.serviceName}</span>
                <ExternalLink size={13} className="text-slate-400 group-hover:text-[#0481A2] shrink-0" />
              </Link>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-[#0481A2] border border-sky-200 shrink-0">
                Service {index + 1} of {totalServices}
              </span>
              {service.hasCommercialMismatch && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                  title={`Commercial Mismatch: Agreed Contract Value (${formatINR(service.contractValue)}) differs from Taxable Billable Subtotal (${formatINR(service.contractValue)})`}
                >
                  Contract/Invoice Mismatch
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{service.serviceCategory}</p>
          </div>
        </div>

        {/* Header Financial Indicators matching Reference Image 2 */}
        <div className="flex items-center gap-6 sm:gap-8 text-xs shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Contract Value</span>
            <span className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.contractValue)}</span>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Invoiced</span>
            <span className="font-bold text-slate-800 text-sm font-sans font-number">{formatINR(service.invoicedAmount)}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Collected</span>
            <span className="font-bold text-emerald-700 text-sm font-sans font-number">{formatINR(service.collectedAmount)}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Outstanding</span>
            <span className="font-bold text-rose-600 text-sm font-sans font-number">{formatINR(service.outstandingAmount)}</span>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-2">
            {/* Payment Status Pill */}
            {service.paymentStatus === "Paid" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span>PAID</span>
              </span>
            ) : service.paymentStatus === "Partially Paid" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>PARTIALLY PAID</span>
              </span>
            ) : service.paymentStatus === "Not Invoiced" || !service.hasIssuedInvoice ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>NOT INVOICED</span>
              </span>
            ) : service.paymentStatus === "Overdue" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                <span>OVERDUE</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>UNPAID</span>
              </span>
            )}

            {/* Service Fulfillment Status Pill */}
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs", statusBadge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isCompleted ? "bg-emerald-600" : "bg-amber-500")} />
              <span>{service.serviceStatus}</span>
            </span>
          </div>

          {/* Actions Dropdown Menu */}
          <div>
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
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-[#0481A2]"
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
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                    className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
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

      {/* 2. Expanded Body Section */}
      {isExpanded && (
        <div className="pt-7 px-8 pb-9 space-y-7 bg-white">
          {/* Top 3-Column Layout: Commercial Details, Fulfillment Progress, Payment Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* A. Service & Commercial Details (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80">
                  <Briefcase size={15} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900">Service &amp; Commercial Details</h4>
                </div>

                <div className="space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Service Name</span>
                    <strong className="text-slate-900 font-semibold text-right max-w-[65%] truncate" title={service.serviceName}>{service.serviceName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Category</span>
                    <span className="text-slate-700">{service.serviceCategory}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Service Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.serviceFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Government Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.govtFee)}</span>
                  </div>
                  {service.additionalFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Additional Fee</span>
                      <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.additionalFee)}</span>
                    </div>
                  )}
                  {service.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-semibold text-emerald-600 font-sans font-number">-{formatINR(service.discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Taxable Amount</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.taxableAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">GST Rate</span>
                    <span className="font-semibold text-slate-700 font-sans font-number">{service.taxRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">GST Amount</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900 leading-tight">Total Service Value<br/><span className="text-[10px] font-normal text-slate-500">(Including GST)</span></span>
                    <strong className="font-bold text-slate-900 text-sm font-sans font-number">{formatINR(service.totalServiceValue)}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned To</span>
                  <InlineAssignEmployeeCell
                    serviceId={service.id}
                    clientId={service.clientId}
                    assignedEmployeeId={service.assignedEmployeeId}
                    assignedEmployeeName={service.assignedEmployeeName}
                    editable={canEdit}
                    onUpdated={() => onRefresh?.()}
                  />
                </div>
                {service.startDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium text-slate-700 font-sans font-number">
                      {new Date(service.startDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Completion</span>
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

            {/* B. Fulfillment Progress (5 Cols) */}
            <div
              onClick={() => onManageStage?.(service.id)}
              className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-sky-300 hover:shadow-xs transition-all group"
              title="Click to manage fulfillment stages"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-[#0481A2] transition-colors">Fulfilment Progress</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Progress: <strong className="text-slate-900 font-sans font-number">{fulfillment.progressPercentage}%</strong>
                    </span>
                    <span className="text-[10px] text-[#0481A2] font-semibold underline ml-1">Manage</span>
                  </div>
                </div>

                {/* Horizontal Milestone Tracker */}
                <div className="py-7 px-2">
                  <ServiceFulfillmentTimeline
                    stages={fulfillment.stages}
                    currentStageName={fulfillment.currentStageName}
                    progressPercentage={fulfillment.progressPercentage}
                    size="md"
                  />
                </div>
              </div>

              {/* Progress Summary Footer Bar */}
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  Current Stage: <strong className="text-slate-800">{fulfillment.currentStageName}</strong>
                </span>
                <span className="text-emerald-700 font-semibold">{fulfillment.currentStageDescription}</span>
              </div>
            </div>

            {/* C. Payment Summary (3 Cols) */}
            <div className="lg:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80">
                  <CreditCard size={15} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900 text-xs">Payment Summary</h4>
                </div>

                <div className="pt-4 space-y-2.5">
                  <span className="text-[11px] text-slate-500 block">Paid Amount</span>
                  <div className="flex items-baseline justify-between">
                    <p className="text-lg font-bold text-slate-900 font-sans font-number">
                      {service.invoicedAmount > 0 ? (
                        <>
                          <span className={service.collectedAmount >= service.invoicedAmount ? "text-emerald-600" : "text-slate-900"}>
                            {formatINR(service.collectedAmount)}
                          </span>{" "}
                          <span className="text-slate-400 text-xs font-normal">/ {formatINR(service.invoicedAmount)}</span>
                        </>
                      ) : service.contractValue > 0 ? (
                        <>
                          <span className="text-slate-900">{formatINR(service.collectedAmount)}</span>{" "}
                          <span className="text-slate-400 text-xs font-normal">/ {formatINR(service.contractValue)}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-sm font-normal">Not Invoiced</span>
                      )}
                    </p>
                    <span className="text-xs font-bold text-slate-600 font-sans font-number">{service.paymentProgress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        service.paymentProgress >= 100
                          ? "bg-emerald-600"
                          : service.paymentProgress > 0
                          ? "bg-[#0481A2]"
                          : "bg-slate-300"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, service.paymentProgress))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Outstanding:</span>
                <strong className={cn("font-bold font-sans font-number", service.outstandingAmount > 0 ? "text-rose-600" : "text-emerald-700")}>
                  {formatINR(service.outstandingAmount)}
                </strong>
              </div>
            </div>
          </div>

          {/* Middle Row: Invoice & Payment History, Documents, Next Action */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* D. Invoice & Payment History (5 Cols) */}
            <div className="md:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-xs">Invoice &amp; Payment History</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewAllInvoices) {
                        onViewAllInvoices(service);
                      } else {
                        setIsHistoryModalOpen(true);
                      }
                    }}
                    className="text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                  >
                    <span>View All</span>
                    <ArrowRight size={11} />
                  </button>
                </div>

                <div className="space-y-2.5 pt-3">
                  {service.invoices.length === 0 && service.payments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No invoices or payments logged for this service yet.</p>
                  ) : (
                    <>
                      {service.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={16} className="text-[#0481A2] shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{inv.invoiceNumber}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Issued: {inv.issueDate} • Due: {inv.dueDate}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <strong className="font-bold text-slate-900 font-sans font-number">{formatINR(inv.totalAmount)}</strong>
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-semibold",
                                inv.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              )}
                            >
                              {inv.status}
                            </span>
                            {onPreviewInvoice && (
                              <button
                                type="button"
                                onClick={() => onPreviewInvoice(inv.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Preview Invoice"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {service.payments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CreditCard size={16} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{p.paymentNumber}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Date: {p.paymentDate} • {p.paymentMethod}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <strong className="font-bold text-emerald-700 font-sans font-number">{formatINR(p.allocatedAmount)}</strong>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
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

            {/* E. Documents (4 Cols) */}
            <div className="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-xs">Documents ({service.documents.length})</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddDocument?.(service.id)}
                    className="text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus size={12} />
                    <span>Add Document</span>
                  </button>
                </div>

                <div className="space-y-2.5 pt-3">
                  {service.documents.length === 0 ? (
                    <div className="py-7 px-3 border border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
                      <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                      <button
                        type="button"
                        onClick={() => onAddDocument?.(service.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer"
                      >
                        <Plus size={11} />
                        <span>Upload Document</span>
                      </button>
                    </div>
                  ) : (
                    service.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Received
                          </span>
                          {doc.fileUrl && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc.fileUrl, doc.fileName)}
                              className="p-1 text-slate-500 hover:text-[#0481A2] hover:bg-sky-50 rounded transition-colors cursor-pointer"
                              title="Download document"
                            >
                              <Download size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.fileName)}
                            disabled={deletingDocId === doc.id}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete document"
                          >
                            {deletingDocId === doc.id ? (
                              <Loader2 size={13} className="animate-spin text-rose-500" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* F. Next Action (3 Cols) */}
            <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Clock size={15} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900 text-xs">Next Action</h4>
                </div>

                <div className="pt-4 space-y-2.5">
                  <div className={cn("p-3.5 rounded-xl border flex items-start gap-2.5", service.nextAction.isCompleted ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-amber-50/60 border-amber-200 text-amber-900")}>
                    {service.nextAction.isCompleted ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs leading-snug">
                      <p className="font-semibold">{service.nextAction.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Due: {service.nextAction.dueDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-right">
                <span className="text-[10px] text-slate-400">Action tracked by CRM</span>
              </div>
            </div>
          </div>

          {/* G. Service Activity Timeline */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[#0481A2]" />
                <h4 className="font-bold text-slate-900 text-xs">Service Activity</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onViewFullActivity) {
                    onViewFullActivity(service);
                  } else {
                    setIsActivityModalOpen(true);
                  }
                }}
                className="text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span>View Full Activity</span>
                <ArrowRight size={11} />
              </button>
            </div>

            <div className="pt-2 space-y-3">
              {service.activities.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No activity recorded for this service yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {service.activities.map((act) => (
                    <div key={act.id} className="relative text-xs flex items-start gap-4">
                      {/* Node Dot */}
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="min-w-[130px] text-[11px] text-slate-400 font-sans font-number">
                        {new Date(act.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex-1">
                        <strong className="text-slate-900 font-semibold block">{act.title}</strong>
                        <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Fallback Financial History Modal */}
      {isHistoryModalOpen && (
        <ServiceFinancialHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          serviceName={service.serviceName}
          clientName={clientName || ""}
          invoices={service.invoices}
          payments={service.payments}
          onPreviewInvoice={onPreviewInvoice}
        />
      )}

      {/* Embedded Fallback Activity History Modal */}
      {isActivityModalOpen && (
        <ServiceActivityHistoryModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          serviceName={service.serviceName}
          clientName={clientName || ""}
          activities={service.activities}
        />
      )}
    </div>
  );
}
