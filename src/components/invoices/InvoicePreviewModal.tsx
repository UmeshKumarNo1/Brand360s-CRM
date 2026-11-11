"use client";

import React, { useRef, useState, useEffect } from "react";
import { Download, Printer, Mail, X, CheckCircle2, Building, AlertCircle, FileText, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";
import { sendInvoiceEmailAction, fetchInvoiceByIdAction } from "@/app/actions/invoices";
import { fetchCrmSettingsAction } from "@/app/actions/settings";

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
  invoiceId?: string;
  settings?: any;
  onSuccess?: () => void;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice: initialInvoice,
  invoiceId,
  settings: initialSettings,
  onSuccess,
}: InvoicePreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<any>(initialInvoice || null);
  const [settings, setSettings] = useState<any>(initialSettings || null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const { success, error: toastError } = useToast();

  const reqIdRef = useRef(0);

  // Sync initialInvoice if passed or changed
  useEffect(() => {
    if (initialInvoice) {
      setInvoice(initialInvoice);
      setFetchError(null);
    }
  }, [initialInvoice]);

  // Sync initialSettings if passed or changed
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Fetch complete invoice data (including client, items, allocations) and CRM settings
  useEffect(() => {
    if (!isOpen) {
      setFetchError(null);
      return;
    }

    const currentReq = ++reqIdRef.current;
    const targetId = invoiceId || initialInvoice?.id || initialInvoice?.invoice_number;

    if (!targetId) {
      if (!initialInvoice) {
        setFetchError("No invoice ID provided.");
      }
      return;
    }

    console.log("[InvoicePreviewModal] Modal opened, fetching complete data for:", targetId);
    setIsLoading(true);
    setFetchError(null);

    Promise.all([
      fetchInvoiceByIdAction(targetId),
      initialSettings ? Promise.resolve(initialSettings) : fetchCrmSettingsAction(),
    ])
      .then(([invRes, sett]) => {
        if (currentReq !== reqIdRef.current) return;

        console.log("[InvoicePreviewModal] Data received:", { invRes, sett });

        if (invRes && invRes.success && invRes.data) {
          setInvoice(invRes.data);
          setFetchError(null);
        } else if (invRes && !invRes.success) {
          // If fetch fails but we already had initialInvoice with enough details, fallback gracefully
          if (initialInvoice) {
            console.warn("[InvoicePreviewModal] Complete fetch failed, falling back to initial invoice:", invRes.error);
            setInvoice(initialInvoice);
          } else {
            setFetchError(invRes?.error || "Failed to load invoice.");
          }
        } else if (invRes) {
          // Backward compatibility if returned direct data
          setInvoice(invRes);
          setFetchError(null);
        } else {
          setFetchError("Invoice record could not be found.");
        }

        if (sett) {
          setSettings(sett);
        }
      })
      .catch((err: any) => {
        if (currentReq !== reqIdRef.current) return;
        console.error("[InvoicePreviewModal] Error fetching invoice preview data:", err);
        if (initialInvoice) {
          setInvoice(initialInvoice);
        } else {
          setFetchError(err.message || "Failed to load invoice details.");
        }
      })
      .finally(() => {
        if (currentReq === reqIdRef.current) {
          setIsLoading(false);
          console.log("[InvoicePreviewModal] Data loading finished.");
        }
      });
  }, [isOpen, invoiceId, initialInvoice, initialSettings]);

  if (!isOpen) return null;

  if (isLoading && !invoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-sm w-full text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-[#077EA1] mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Loading Invoice Preview...</h3>
          <p className="text-xs text-slate-500">Retrieving GST invoice data and client details</p>
          <button
            onClick={onClose}
            className="mt-2 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (fetchError && !invoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle size={28} className="text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Failed to Load Invoice</h3>
          <p className="text-xs text-slate-500">{fetchError}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                const targetId = invoiceId || initialInvoice?.id;
                if (targetId) {
                  setIsLoading(true);
                  setFetchError(null);
                  fetchInvoiceByIdAction(targetId)
                    .then((res) => {
                      if (res.success && res.data) setInvoice(res.data);
                      else setFetchError(res.error || "Failed to load.");
                    })
                    .catch((err) => setFetchError(err.message))
                    .finally(() => setIsLoading(false));
                }
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#077EA1] text-white hover:bg-[#066B89] rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const client = invoice?.client || {};
  const items = invoice?.items || [];
  const settingsData = settings || {
    company_name: "BRAND 360s",
    company_address: "1531/A Anna Nagar, Thondi Road, Sivaganga, Tamil Nadu 630561",
    gstin: "33AAAAA0000A1Z5",
    pan: "ABCDE1234F",
    bank_name: "HDFC Bank",
    account_number: "50200088991122",
    ifsc: "HDFC0001234",
    account_holder_name: "BRAND 360S PRIVATE LIMITED",
    upi_id: "brand360s@hdfcbank",
    terms_conditions: "1. Payments must be cleared by due date. 2. Disputes subject to Sivaganga jurisdiction.",
    authorized_signatory: "Managing Director",
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    console.log("[InvoicePreviewModal] Starting PDF rendering for invoice:", invoice?.invoiceNumber || invoice?.invoice_number);

    try {
      // Dynamic import of html2pdf.js for client-side execution
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${invoice?.invoiceNumber || invoice?.invoice_number || "Invoice"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().from(printRef.current).set(opt).save();
      console.log("[InvoicePreviewModal] PDF rendering & download completed successfully.");
      success("PDF generated", "Invoice downloaded successfully.");
    } catch (err: any) {
      console.error("[InvoicePreviewModal] PDF rendering error:", err);
      toastError("Download failed", err.message || "Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.id) return;
    setIsSendingEmail(true);
    try {
      const res = await sendInvoiceEmailAction(invoice.id, customEmail.trim() || undefined);
      if (res.success) {
        success("Invoice emailed", `Sent to ${customEmail.trim() || client?.email || "client"}.`);
        setShowEmailInput(false);
        if (onSuccess) onSuccess();
      } else {
        toastError("Email dispatch failed", res.error);
      }
    } catch {
      toastError("Delivery failed", "Server connection error.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isInterState = Boolean(client?.state && !client.state.toLowerCase().includes("tamil nadu"));
  const subtotal = Number(invoice?.subtotal) || 0;
  const discount = Number(invoice?.discountAmount || invoice?.discount_amount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = Number(invoice?.taxRate || invoice?.tax_rate) || 18;
  const taxAmount = Number(invoice?.taxAmount || invoice?.tax_amount) || 0;
  const totalAmount = Number(invoice?.totalAmount || invoice?.total_amount) || 0;
  const amountPaid = Number(invoice?.amountPaid || invoice?.amount_paid) || 0;
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Action Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800">
              {invoice.invoiceNumber || invoice.invoice_number}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800">
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmailInput(!showEmailInput)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Mail size={13} className="text-[#077EA1]" />
              <span>Email</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download size={13} />
              <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Email Dispatch Sub-bar */}
        {showEmailInput && (
          <div className="px-6 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-slate-700">Recipient Email:</span>
              <input
                type="email"
                defaultValue={client.email || ""}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="client-billing@company.com"
                className="flex-1 max-w-sm px-2.5 py-1 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:border-[#077EA1]"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="px-3 py-1 bg-[#077EA1] text-white rounded text-xs font-semibold hover:bg-[#066B89] transition-colors cursor-pointer"
            >
              {isSendingEmail ? "Dispatching..." : "Send Now"}
            </button>
          </div>
        )}

        {/* Printable Invoice Page */}
        <div className="overflow-y-auto p-8 flex-1 bg-white">
          <div
            ref={printRef}
            className="max-w-[780px] mx-auto p-8 bg-white border border-slate-200 rounded-lg shadow-xs space-y-6 text-slate-800 font-sans"
            style={{ minHeight: "1050px" }}
          >
            {/* Invoice Header */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-[#243E76]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#243E76] text-white flex items-center justify-center font-bold text-lg">
                    360
                  </div>
                  <h1 className="text-2xl font-black text-[#243E76] tracking-tight">
                    {settingsData.company_name}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mt-2 leading-relaxed">
                  {settingsData.company_address}
                </p>
                <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                  <p><strong>GSTIN:</strong> {settingsData.gstin} | <strong>PAN:</strong> {settingsData.pan}</p>
                  {settingsData.cin && <p><strong>CIN:</strong> {settingsData.cin}</p>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-[#243E76] text-white font-bold text-sm tracking-wider uppercase rounded">
                  TAX INVOICE
                </span>
                <p className="font-mono text-sm font-bold text-slate-900 mt-2">
                  {invoice.invoiceNumber || invoice.invoice_number}
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <p><strong>Invoice Date:</strong> {invoice.issueDate || invoice.issue_date}</p>
                  <p><strong>Due Date:</strong> {invoice.dueDate || invoice.due_date}</p>
                  <p><strong>Payment Terms:</strong> {invoice.paymentTerms || invoice.payment_terms || "Due on Receipt"}</p>
                </div>
              </div>
            </div>

            {/* Client / Bill To & Ship To Details */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-[#077EA1] uppercase tracking-wider text-[10px] block mb-1">
                  Billed To
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{client?.companyName || client?.company_name || "Client Company"}</h4>
                <p className="text-slate-600 mt-0.5">Attn: {client?.contactPerson || client?.contact_person || "Finance Dept"}</p>
                <p className="text-slate-500 mt-0.5">{client?.address || client?.city || "Tamil Nadu, India"}</p>
                <p className="text-slate-500 mt-0.5">{client?.email || "-"} • {client?.phone || "-"}</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-[#077EA1] uppercase tracking-wider text-[10px] block mb-1">
                  Client Tax Identification
                </span>
                <p><strong>GSTIN:</strong> {client?.gstNumber || client?.gst_number || "Unregistered"}</p>
                <p><strong>PAN:</strong> {client?.panNumber || client?.pan_number || "Not Provided"}</p>
                <p><strong>Place of Supply:</strong> {client?.state || "Tamil Nadu"} (33)</p>
                <p><strong>Billing Category:</strong> {invoice?.billingType || invoice?.billing_type || "Full Payment"}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#243E76] text-white font-semibold">
                  <th className="py-2.5 px-3 rounded-l">#</th>
                  <th className="py-2.5 px-3">Service Deliverable / Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Tax Rate</th>
                  <th className="py-2.5 px-3 text-right rounded-r">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Standard Client Professional Services
                    </td>
                  </tr>
                ) : (
                  items.map((it: any, idx: number) => (
                    <tr key={it.id || idx}>
                      <td className="py-3 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{it.description}</td>
                      <td className="py-3 px-3 text-center">{it.quantity || 1}</td>
                      <td className="py-3 px-3 text-right">{formatINR(Number(it.unit_price) || 0)}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{it.tax_rate || 18}%</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatINR(Number(it.total) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals & Tax Breakdown */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Payment Instructions & Bank Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1.5">
                <h5 className="font-bold text-[#243E76] uppercase tracking-wider text-[11px]">
                  Remittance / Bank Account Details
                </h5>
                <p><strong>Bank:</strong> {settingsData.bank_name}</p>
                <p><strong>A/C Name:</strong> {settingsData.account_holder_name}</p>
                <p><strong>A/C No:</strong> <span className="font-mono font-bold">{settingsData.account_number}</span></p>
                <p><strong>IFSC Code:</strong> <span className="font-mono">{settingsData.ifsc}</span></p>
                <p><strong>UPI ID:</strong> <span className="font-mono text-[#077EA1] font-bold">{settingsData.upi_id}</span></p>
              </div>

              {/* Financial Calculation Column */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatINR(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatINR(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Taxable Amount:</span>
                  <span className="font-semibold text-slate-800">{formatINR(taxable)}</span>
                </div>

                {/* GST Breakdown (CGST/SGST or IGST) */}
                {isInterState ? (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Integrated GST (IGST @ {taxRate}%):</span>
                    <span className="font-semibold">{formatINR(taxAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>Central GST (CGST @ {taxRate / 2}%):</span>
                      <span className="font-semibold">{formatINR(taxAmount / 2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>State GST (SGST @ {taxRate / 2}%):</span>
                      <span className="font-semibold">{formatINR(taxAmount / 2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-base font-bold text-[#243E76]">
                  <span>Total Invoice Value:</span>
                  <span>{formatINR(totalAmount)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600">
                  <span>Amount Paid / Credited:</span>
                  <span className="font-semibold text-emerald-700">{formatINR(amountPaid)}</span>
                </div>

                <div className="flex justify-between py-2 bg-rose-50 px-2 rounded text-sm font-bold text-rose-700">
                  <span>Balance Payable:</span>
                  <span>{formatINR(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signature */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-[10px] text-slate-500">
              <div>
                <strong className="block text-slate-700 uppercase mb-1">Terms & Conditions</strong>
                <p className="leading-relaxed">{invoice.terms || settingsData.terms_conditions}</p>
              </div>

              <div className="text-right flex flex-col justify-end items-end">
                <div className="w-36 border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800 text-xs">
                  {settingsData.company_name}
                </div>
                <span>Authorized Signatory</span>
                <span className="text-[9px] text-slate-400">Electronically generated tax invoice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

