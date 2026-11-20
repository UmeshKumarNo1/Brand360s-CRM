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

  // Status Badge Colors matching Reference Image
  const isCompleted = service.serviceStatus === "Completed";
  const statusBadge = isCompleted
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all">
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
        <div className="pt-3.5 px-4 sm:px-6 pb-6 space-y-3.5 bg-white">
          {/* Main 3-Box Section: Left (Details), Center (Fulfilment Progress & Invoices/Docs), Right (Payment & Next Action) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* 1. Left Box: Service & Commercial Details (3 Cols) */}
            <div className="lg:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <Briefcase size={14} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900 text-xs">Service &amp; Commercial Details</h4>
                </div>

                <div className="space-y-1.5 pt-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Service</span>
                    <strong className="text-slate-900 font-semibold truncate text-right">{service.serviceName}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Category</span>
                    <span className="text-slate-700 truncate text-right">{service.serviceCategory}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Service Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.serviceFee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 shrink-0">Govt Fee</span>
                    <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(service.govtFee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Total Value</span>
                    <strong className="font-bold text-slate-900 text-xs font-sans font-number">{formatINR(service.totalAmount)}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Assigned To</span>
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
                  <span className="text-slate-500 shrink-0">Target Date</span>
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

            {/* 2. Center Box: Row 1 Fulfilment Progress (Reduced Height) & Row 2 Invoice & Payment History + Documents (Reduced Sizes) (6 Cols) */}
            <div className="lg:col-span-6 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between gap-2.5">
              {/* Row 1: Fulfilment Progress (Reduced Height, Compact Timeline) */}
              <div
                onClick={() => onManageStage?.(service.id)}
                className="w-full bg-white border border-slate-200/80 rounded-lg p-2.5 sm:p-3 shadow-2xs cursor-pointer hover:border-sky-300 hover:shadow-xs transition-all group space-y-1.5"
                title="Click to manage fulfillment stages"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-[#0481A2] transition-colors">
                      Fulfilment Progress
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Progress: <strong className="text-slate-900 font-sans font-number">{fulfillment.progressPercentage}%</strong>
                    </span>
                    <span className="text-[10px] text-[#0481A2] font-semibold underline ml-1">Manage</span>
                  </div>
                </div>

                {/* Horizontal Milestone Tracker */}
                <div className="py-1 px-1 sm:px-2">
                  <ServiceFulfillmentTimeline
                    stages={fulfillment.stages}
                    currentStageName={fulfillment.currentStageName}
                    progressPercentage={fulfillment.progressPercentage}
                    size="sm"
                  />
                </div>

                {/* Progress Summary Footer Bar */}
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 truncate mr-2">
                    Current Stage: <strong className="text-slate-800">{fulfillment.currentStageName}</strong>
                  </span>
                  <span className="text-emerald-700 font-semibold truncate shrink-0">{fulfillment.currentStageDescription}</span>
                </div>
              </div>

              {/* Row 2: Invoice & Payment History & Documents (Reduced Sizes, nested in Center Box) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* D. Invoice & Payment History */}
                <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-[#0481A2]" />
                        <h4 className="font-bold text-slate-900 text-xs">Invoice &amp; Payment History</h4>
                      </div>
                      <button
                        type="button"
                        className="text-[10px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ArrowRight size={9} />
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1 max-h-[145px] overflow-y-auto">
                      {service.invoices.length === 0 && service.payments.length === 0 ? (
                        <p className="text-[10.5px] text-slate-400 py-3 text-center">No invoices or payments logged yet.</p>
                      ) : (
                        <>
                          {service.invoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="py-1 px-2 rounded-md border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-1.5 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileText size={12} className="text-[#0481A2] shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate text-[10.5px]">{inv.invoiceNumber}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {inv.issueDate} • Due: {inv.dueDate}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <strong className="font-bold text-slate-900 font-sans font-number text-[11px]">{formatINR(inv.totalAmount)}</strong>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-semibold",
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
                                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="Preview Invoice"
                                  >
                                    <Eye size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {service.payments.map((p) => (
                            <div
                              key={p.id}
                              className="py-1 px-2 rounded-md border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-1.5 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CreditCard size={12} className="text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate text-[10.5px]">{p.paymentNumber}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    {p.paymentDate} • {p.paymentMethod}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <strong className="font-bold text-emerald-700 font-sans font-number text-[11px]">{formatINR(p.allocatedAmount)}</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
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

                {/* E. Documents */}
                <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-[#0481A2]" />
                        <h4 className="font-bold text-slate-900 text-xs">Documents ({service.documents.length})</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddDocument?.(service.id)}
                        className="text-[10px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus size={10} />
                        <span>Add</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1 max-h-[145px] overflow-y-auto">
                      {service.documents.length === 0 ? (
                        <div className="py-2.5 px-2 border border-dashed border-slate-200 rounded-md text-center space-y-1 bg-slate-50/50">
                          <p className="text-[10px] text-slate-400">No documents uploaded.</p>
                          <button
                            type="button"
                            onClick={() => onAddDocument?.(service.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-[#0481A2] hover:underline font-semibold cursor-pointer"
                          >
                            <Plus size={9} />
                            <span>Upload Document</span>
                          </button>
                        </div>
                      ) : (
                        service.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="py-1 px-2 rounded-md border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-1.5 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate text-[10.5px]" title={doc.fileName}>
                                {doc.fileName}
                              </span>
                              <span className="text-[9px] text-slate-400 block truncate">
                                {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Received
                              </span>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-0.5 text-slate-400 hover:text-slate-700"
                                  title="Download"
                                >
                                  <Download size={11} />
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

            {/* 3. Right Box: Payment Summary & Next Action (3 Cols) */}
            <div className="lg:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between space-y-2.5">
              {/* Payment Summary */}
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <CreditCard size={14} className="text-[#0481A2]" />
                  <h4 className="font-bold text-slate-900 text-xs">Payment Summary</h4>
                </div>

                <div className="pt-2 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10.5px] text-slate-500">Paid Amount</span>
                    <span className="text-xs font-bold text-slate-700 font-sans font-number">{service.paymentProgress}%</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-base font-bold text-slate-900 font-sans font-number">
                      <span className={service.collectedAmount >= service.contractValue ? "text-emerald-600" : "text-slate-900"}>
                        {formatINR(service.collectedAmount)}
                      </span>{" "}
                      <span className="text-slate-400 text-xs font-normal">/ {formatINR(service.contractValue)}</span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
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

              <div className="space-y-2">
                <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Outstanding:</span>
                  <strong className={cn("font-bold font-sans font-number text-[11.5px]", service.outstandingAmount > 0 ? "text-rose-600" : "text-emerald-700")}>
                    {formatINR(service.outstandingAmount)}
                  </strong>
                </div>

                {/* Next Action */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#0481A2]" />
                    <h4 className="font-bold text-slate-900 text-xs">Next Action</h4>
                  </div>

                  <div className={cn("p-2 rounded-lg border flex items-start gap-2", service.nextAction.isCompleted ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-amber-50/60 border-amber-200 text-amber-900")}>
                    {service.nextAction.isCompleted ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-[11px] leading-snug min-w-0">
                      <p className="font-semibold truncate">{service.nextAction.title}</p>
                      <p className="text-[9.5px] text-slate-500 mt-0.5">Due: {service.nextAction.dueDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* G. Service Activity Timeline */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#0481A2]" />
                <h4 className="font-bold text-slate-900 text-xs">Service Activity</h4>
              </div>
              <button
                type="button"
                className="text-[10.5px] text-[#0481A2] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span>View Full Activity</span>
                <ArrowRight size={10} />
              </button>
            </div>

            <div className="pt-1 space-y-2">
              {service.activities.length === 0 ? (
                <p className="text-xs text-slate-400 py-2.5 text-center">No activity recorded for this service yet.</p>
              ) : (
                <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {service.activities.map((act) => (
                    <div key={act.id} className="relative text-xs flex items-start gap-3">
                      {/* Node Dot */}
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="min-w-[110px] text-[10.5px] text-slate-400 font-sans font-number">
                        {new Date(act.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex-1">
                        <strong className="text-slate-900 font-semibold block text-[11px]">{act.title}</strong>
                        <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
