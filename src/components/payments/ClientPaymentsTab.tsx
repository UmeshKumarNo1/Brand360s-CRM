"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, CreditCard, Calendar, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, RefreshCw, FileText, Eye, Mail, Receipt, Ban, FileSignature } from "lucide-react";
import { fetchClientFinancialsAction, deleteInstallmentAction } from "@/app/actions/payments";
import { fetchInvoicesAction, sendInvoiceEmailAction, cancelInvoiceAction, voidInvoiceAction } from "@/app/actions/invoices";
import { fetchContractAmendmentsAction, ContractAmendmentRecord } from "@/app/actions/contract-amendments";
import { ContractAmendmentModal } from "@/components/clients/ContractAmendmentModal";
import { formatINR } from "@/lib/utils";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreateInstallmentModal } from "./CreateInstallmentModal";
import { EditInstallmentModal } from "./EditInstallmentModal";
import { AllocatePaymentModal } from "./AllocatePaymentModal";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

interface ClientPaymentsTabProps {
  clientId: string;
  clientName: string;
  contractValue: number;
  paymentsReceived: number;
  balanceReceivable: number;
}

export function ClientPaymentsTab({
  clientId,
  clientName,
  contractValue,
  paymentsReceived,
  balanceReceivable,
}: ClientPaymentsTabProps) {
  const [data, setData] = useState<{ payments: any[]; schedules: any[] }>({ payments: [], schedules: [] });
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [amendments, setAmendments] = useState<ContractAmendmentRecord[]>([]);
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [allocatingPayment, setAllocatingPayment] = useState<any | null>(null);
  const [viewingReceiptPaymentId, setViewingReceiptPaymentId] = useState<string | null>(null);

  const [selectedForPayment, setSelectedForPayment] = useState<{
    id: string;
    remaining: number;
  } | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async (silent = false) => {
    const currentReqId = ++requestIdRef.current;
    if (!silent) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [res, clientInvoicesData, amendmentsData] = await Promise.all([
        fetchClientFinancialsAction(clientId),
        fetchInvoicesAction(clientId),
        fetchContractAmendmentsAction(clientId),
      ]);
      if (currentReqId === requestIdRef.current) {
        setData(res);
        setClientInvoices(clientInvoicesData || []);
        setAmendments(amendmentsData || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load financial data.");
      }
    } finally {
      if (currentReqId === requestIdRef.current && !silent) {
        setIsLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteInstallment = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this installment milestone?")) return;
    setDeletingId(scheduleId);
    try {
      await deleteInstallmentAction(scheduleId, clientId);
      success("Installment removed", "Milestone schedule was successfully deleted.");
      loadData();
    } catch {
      toastError("Failed to delete", "Could not remove installment.");
    } finally {
      setDeletingId(null);
    }
  };

  const openPaymentForInstallment = (schedule: any) => {
    const rem = Math.max(0, (Number(schedule.amount) || 0) - (Number(schedule.amount_paid) || 0));
    setSelectedForPayment({
      id: schedule.id,
      remaining: rem > 0 ? rem : Number(schedule.amount) || 0,
    });
    setIsPaymentModalOpen(true);
  };

  const handleSendInvoiceEmail = async (invoiceId: string) => {
    setSendingInvoiceId(invoiceId);
    try {
      const res = await sendInvoiceEmailAction(invoiceId);
      if (res.success) {
        success("Invoice sent", "Invoice dispatched to client email via Resend.");
        loadData();
      } else {
        toastError("Email dispatch failed", res.error || "Unable to send invoice email.");
      }
    } catch {
      toastError("Email dispatch failed", "Server connection error.");
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid in full":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Overdue":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Collections & Scheduled Installments</h4>
          <p className="text-xs text-slate-500">Audit logged receipts and configure payment milestones</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh financials"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>

          <button
            onClick={() => setIsInstallmentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={14} className="text-[#0481A2]" />
            <span>+ Add Installment</span>
          </button>

          <button
            onClick={() => {
              setSelectedForPayment(null);
              setIsPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <CreditCard size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {!errorMessage && (
        <>
          {/* Installment Milestones Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#0481A2]" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Installment Milestones & Schedules ({data.schedules.length})
                </h5>
              </div>
              <span className="text-xs font-bold text-rose-600">
                Outstanding Receivable: {formatINR(balanceReceivable)}
              </span>
            </div>

            {isLoading ? (
              <p className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={13} className="animate-spin text-[#0481A2]" />
                <span>Loading installment schedules...</span>
              </p>
            ) : data.schedules.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <p>No installment milestones defined for this client yet.</p>
                <button
                  onClick={() => setIsInstallmentModalOpen(true)}
                  className="text-[#0481A2] font-semibold hover:underline cursor-pointer"
                >
                  + Add Installment Schedule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide">
                      <th className="py-2.5 px-4 text-center">Installment</th>
                      <th className="py-2.5 px-4 text-center">Amount</th>
                      <th className="py-2.5 px-4 text-center">Amount Paid</th>
                      <th className="py-2.5 px-4 text-center">Remaining</th>
                      <th className="py-2.5 px-4 text-center">Due Date</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.schedules.map((s) => {
                      const status = s.computed_status || s.status;
                      const isPaid = status === "Paid in full";
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{s.title}</div>
                            {s.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.notes}</div>}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatINR(s.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            {formatINR(s.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            {formatINR(s.remaining)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${status === "Overdue" ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                              {s.due_date}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(status)}`}>
                              {status === "Paid in full" && <CheckCircle2 size={10} />}
                              {status === "Overdue" && <AlertCircle size={10} />}
                              {status === "Pending" && <Clock size={10} />}
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isPaid && (
                                <button
                                  onClick={() => openPaymentForInstallment(s)}
                                  title="Pay against this milestone"
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Record Pay
                                </button>
                              )}
                              <button
                                onClick={() => setEditingInstallment(s)}
                                title="Edit installment"
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteInstallment(s.id)}
                                disabled={deletingId === s.id}
                                title="Delete installment"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-50"
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
            )}
          </div>

          {/* Payment Receipts History */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CreditCard size={14} className="text-[#0481A2]" />
                Payment Receipts History ({data.payments.length})
              </h5>
              <span className="text-xs font-bold text-emerald-600">
                Total Verified: {formatINR(paymentsReceived)}
              </span>
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={13} className="animate-spin text-[#0481A2]" />
                <span>Loading payment receipts...</span>
              </p>
            ) : data.payments.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No payments recorded for this client yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {data.payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-sans font-number">{formatINR(Number(p.amount) || 0)}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                          {p.payment_method}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Ref: {p.transaction_ref || "-"} • Date: {p.payment_date} • By: {p.recorder?.full_name || "System"}
                      </p>
                      {p.notes && <p className="text-[11px] text-slate-500 mt-0.5 italic">{p.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingReceiptPaymentId(p.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-[#077EA1] hover:bg-sky-50 transition-colors cursor-pointer"
                        title="View / Download Payment Receipt"
                      >
                        <Receipt size={14} />
                      </button>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={11} /> {p.status}
                      </span>
                      <button
                        onClick={() =>
                          setAllocatingPayment({
                            id: p.id,
                            clientId,
                            companyName: clientName,
                            amount: Number(p.amount) || 0,
                            totalAllocated: p.totalAllocated,
                            availableAmount: p.availableAmount,
                          })
                        }
                        className="px-2 py-0.5 text-[11px] font-semibold text-[#077EA1] hover:bg-sky-50 rounded border border-[#077EA1]/30 transition-colors cursor-pointer"
                        title="Allocate payment to invoice"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Invoices Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Tax Invoices</h4>
                <p className="text-xs text-slate-500">Official GST bills generated for this client</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAmendmentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  title="Amend agreed contract scope value"
                >
                  <FileSignature size={14} />
                  <span>Contract Amendment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Issue Invoice</span>
                </button>
              </div>
            </div>

            {/* Contract Amendments History Sub-card (if any) */}
            {amendments.length > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1.5 mb-2">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <FileSignature size={14} className="text-emerald-700" />
                    Approved Contract Amendments ({amendments.length})
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Total Additional Scope: +{formatINR(amendments.reduce((sum, a) => sum + a.additionalAmount, 0))}
                  </span>
                </div>
                <div className="divide-y divide-emerald-200/60 max-h-36 overflow-y-auto">
                  {amendments.map((a) => (
                    <div key={a.id} className="py-1.5 flex items-center justify-between text-[11.5px]">
                      <div>
                        <span className="font-semibold text-emerald-950">{a.reason}</span>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          Approved by {a.approvedByName} • {new Date(a.approvalDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 font-sans font-number">+{formatINR(a.additionalAmount)}</span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {formatINR(a.previousContractValue)} → {formatINR(a.revisedContractValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clientInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No invoices issued for this client yet. Click &quot;Issue Invoice&quot; to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide align-middle">
                      <th className="py-2.5 px-3 text-center">Invoice #</th>
                      <th className="py-2.5 px-3 text-center">Date</th>
                      <th className="py-2.5 px-3 text-center">Due Date</th>
                      <th className="py-2.5 px-3 text-center">Taxable</th>
                      <th className="py-2.5 px-3 text-center">Total</th>
                      <th className="py-2.5 px-3 text-center">Paid</th>
                      <th className="py-2.5 px-3 text-center">Balance</th>
                      <th className="py-2.5 px-3 text-center">Contract Scope</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientInvoices.map((inv) => {
                      const taxableAmount =
                        inv.subtotal !== undefined && inv.subtotal !== null && Number(inv.subtotal) > 0
                          ? Number(inv.subtotal)
                          : Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.taxAmount) || 0));
                      const isOverbilling = contractValue > 0 && taxableAmount > contractValue + 0.01;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600">{inv.issueDate}</td>
                          <td className="py-2.5 px-3 text-slate-600">{inv.dueDate}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-sans font-number">{formatINR(inv.subtotal)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0481A2] font-sans font-number">{formatINR(inv.totalAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 font-sans font-number">{formatINR(inv.amountPaid || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-sans font-number">{formatINR(inv.balanceDue)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isOverbilling ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={`Taxable invoice subtotal (${formatINR(taxableAmount)}) exceeds agreed contract (${formatINR(contractValue)})`}>
                                Above Contract
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                Within Contract
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inv.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : inv.status === "Cancelled" || inv.status === "Void"
                                ? "bg-slate-100 text-slate-500 line-through"
                                : "bg-sky-50 text-sky-700"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewInvoiceId(inv.id)}
                                className="p-1 text-slate-400 hover:text-[#0481A2] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Preview & Download PDF"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleSendInvoiceEmail(inv.id)}
                                disabled={sendingInvoiceId === inv.id}
                                className="p-1 text-slate-400 hover:text-[#0481A2] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title={inv.emailSentAt ? `Sent to ${inv.emailSentTo}` : "Email Invoice"}
                              >
                                <Mail size={13} className={sendingInvoiceId === inv.id ? "animate-pulse text-[#0481A2]" : inv.emailSentAt ? "text-emerald-600" : ""} />
                              </button>
                              {inv.status !== "Cancelled" && inv.status !== "Void" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = prompt(`Enter reason to cancel invoice ${inv.invoiceNumber}:`);
                                    if (!reason) return;
                                    try {
                                      const res = await cancelInvoiceAction(inv.id, reason);
                                      if (res.error) {
                                        toastError("Cancel failed", res.error);
                                      } else {
                                        success("Invoice Cancelled", `Invoice ${inv.invoiceNumber} has been safely cancelled.`);
                                        loadData(true);
                                      }
                                    } catch (err: any) {
                                      toastError("Cancel error", err.message || "Failed to cancel invoice.");
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Cancel Invoice (Safe Correction)"
                                >
                                  <Ban size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => loadData(true)}
        defaultClientId={clientId}
        defaultClientName={clientName}
      />

      {previewInvoiceId && (
        <InvoicePreviewModal
          invoiceId={previewInvoiceId}
          isOpen={!!previewInvoiceId}
          onClose={() => setPreviewInvoiceId(null)}
        />
      )}

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedForPayment(null);
        }}
        onSuccess={() => loadData(true)}
        defaultClientId={clientId}
        defaultClientName={clientName}
        defaultInstallmentId={selectedForPayment?.id}
        defaultAmount={selectedForPayment?.remaining}
        availableInstallments={data.schedules}
      />

      <CreateInstallmentModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        onSuccess={() => loadData(true)}
        clientId={clientId}
        clientName={clientName}
      />

      <ContractAmendmentModal
        isOpen={isAmendmentModalOpen}
        onClose={() => setIsAmendmentModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        currentContractValue={contractValue}
        onSuccess={(newAmendment) => {
          setAmendments((prev) => [newAmendment, ...prev]);
          success("Contract Scope Amended", `Added +${formatINR(newAmendment.additionalAmount)} to contract scope.`);
          loadData(true);
        }}
      />

      <EditInstallmentModal
        isOpen={!!editingInstallment}
        installment={editingInstallment}
        onClose={() => setEditingInstallment(null)}
        onSuccess={() => loadData(true)}
      />

      <PaymentReceiptModal
        isOpen={!!viewingReceiptPaymentId}
        paymentId={viewingReceiptPaymentId || undefined}
        onClose={() => setViewingReceiptPaymentId(null)}
        onSuccess={() => loadData(true)}
      />

      <AllocatePaymentModal
        isOpen={!!allocatingPayment}
        payment={allocatingPayment}
        onClose={() => setAllocatingPayment(null)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
