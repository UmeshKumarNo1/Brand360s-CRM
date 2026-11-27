"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Download,
  Printer,
  Mail,
  X,
  CheckCircle2,
  Building,
  AlertCircle,
  Receipt as ReceiptIcon,
  Loader2,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import { formatINR, numberToWordsINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";
import {
  fetchPaymentReceiptDetailsAction,
  sendReceiptEmailAction,
  generatePaymentReceiptAction,
  PaymentReceiptDetails,
} from "@/app/actions/receipts";
import { fetchCrmSettingsAction } from "@/app/actions/settings";
import { BRAND_LOGO_BASE64 } from "@/lib/brandLogoBase64";

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId?: string;
  paymentId?: string;
  onSuccess?: () => void;
}

export function PaymentReceiptModal({
  isOpen,
  onClose,
  receiptId,
  paymentId,
  onSuccess,
}: PaymentReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [receipt, setReceipt] = useState<PaymentReceiptDetails | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const { success, error: toastError } = useToast();

  const [activeLookupId, setActiveLookupId] = useState<string | undefined>(receiptId || paymentId);

  useEffect(() => {
    setActiveLookupId(receiptId || paymentId);
  }, [receiptId, paymentId]);

  const loadReceiptData = async (overrideId?: string) => {
    const lookup = overrideId || activeLookupId;
    if (!lookup) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const [recRes, settRes] = await Promise.all([
        fetchPaymentReceiptDetailsAction(lookup),
        fetchCrmSettingsAction(),
      ]);

      if (recRes.success && recRes.receipt) {
        setReceipt(recRes.receipt);
        setCustomEmail(recRes.receipt.client?.email || "");
        setFetchError(null);
      } else {
        setFetchError(recRes.error || "Failed to load payment receipt.");
      }

      if (settRes) {
        setSettings(settRes);
      }
    } catch (err: any) {
      setFetchError(err.message || "Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (receiptId || paymentId)) {
      loadReceiptData(receiptId || paymentId);
    } else {
      setReceipt(null);
      setFetchError(null);
      setShowEmailInput(false);
    }
  }, [isOpen, receiptId, paymentId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !receipt) return;
    setIsDownloading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${receipt.receiptNumber || "Payment-Receipt"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().from(printRef.current).set(opt).save();
      success("PDF generated", "Payment receipt downloaded successfully.");
    } catch (err: any) {
      console.error("Receipt PDF rendering error:", err);
      toastError("Download failed", err.message || "Failed to generate receipt PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRegenerate = async () => {
    const pId = receipt?.payment?.id || paymentId;
    if (!pId) return;

    setIsRegenerating(true);
    try {
      const res = await generatePaymentReceiptAction({ paymentId: pId });
      if (res.success && res.receipt?.id) {
        success("Receipt generated", "Payment receipt successfully synced.");
        setActiveLookupId(res.receipt.id);
        await loadReceiptData(res.receipt.id);
        if (onSuccess) onSuccess();
      } else {
        toastError("Generation failed", res.error || "Failed to generate receipt.");
      }
    } catch (err: any) {
      toastError("Error", err.message || "Failed to regenerate receipt.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!receipt?.id) return;
    setIsSendingEmail(true);

    try {
      const res = await sendReceiptEmailAction(receipt.id, customEmail.trim() || undefined);
      if (res.success) {
        success("Receipt emailed", `Sent to ${customEmail.trim() || receipt.client?.email || "client"}.`);
        setShowEmailInput(false);
      } else {
        toastError("Email dispatch failed", res.error);
      }
    } catch {
      toastError("Delivery failed", "Server connection error.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const company = {
    name: settings?.company_name || "BRAND 360S PRIVATE LIMITED",
    address: settings?.company_address || "2nd Floor, Innovation Hub, Madurai Main Road, Sivaganga, TN - 630561",
    gstin: settings?.gstin || "33AAAAA0000A1Z5",
    pan: settings?.pan || "AAAAA0000A",
    authorizedSignatory: settings?.authorized_signatory || "Managing Director",
  };

  const amountInWords = receipt ? numberToWordsINR(receipt.amountReceived) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#077EA1] flex items-center justify-center">
              <ReceiptIcon size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  {receipt?.receiptNumber || "Payment Receipt"}
                </span>
                {receipt && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified Credited
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Official Payment Acknowledgement</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {receipt && (
              <>
                <button
                  onClick={() => setShowEmailInput(!showEmailInput)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Email receipt to client"
                >
                  <Mail size={13} />
                  <span className="hidden sm:inline">Email</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Print receipt"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-3 py-1.5 rounded-lg bg-[#243E76] hover:bg-[#1B2F5B] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Download receipt PDF"
                >
                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Download PDF</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email Input Bar */}
        {showEmailInput && receipt && (
          <div className="bg-sky-50/80 border-b border-sky-100 px-6 py-2.5 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Recipient Email:</span>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="billing@clientcompany.com"
              className="flex-1 max-w-sm px-3 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#077EA1] bg-white"
            />
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !customEmail.trim()}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-[#077EA1] hover:bg-[#05607C] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
              <span>Send Now</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex justify-center">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-[#077EA1]" />
              <p className="text-xs font-semibold">Generating receipt preview...</p>
            </div>
          ) : fetchError ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-3">
              <AlertCircle size={36} className="text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Receipt Not Available</h4>
              <p className="text-xs text-slate-500">{fetchError}</p>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#243E76] text-white text-xs font-bold hover:bg-[#1B2F5B] transition-all cursor-pointer shadow-2xs"
              >
                {isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                <span>Generate Receipt Now</span>
              </button>
            </div>
          ) : receipt ? (
            /* Printable A4 Container */
            <div
              ref={printRef}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden w-full max-w-2xl text-slate-800 font-sans relative"
              style={{ minHeight: "680px" }}
            >
              {/* Deep Navy Header */}
              <div className="bg-[#1B3260] text-white px-6 sm:px-8 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img
                    src="/brand360s-darkmodelogo.svg"
                    alt="BRAND 360s"
                    className="h-9 sm:h-10 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-wide uppercase">
                      PAYMENT RECEIPT
                    </h2>
                    <p className="text-[11px] text-sky-200">
                      Issue Date: {receipt.paymentDate}
                      {receipt.invoice ? ` • Ref: ${receipt.invoice.invoiceNumber}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-sky-200 block">
                    Receipt No
                  </span>
                  <div className="text-sm sm:text-base font-extrabold font-mono">
                    NO: {receipt.receiptNumber}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Bill To (Left) & From (Right) */}
                <div className="grid grid-cols-2 gap-6 pb-5 border-b border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#0481A2] tracking-wider block mb-1">
                      Bill To:
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm leading-snug">
                      {receipt.client?.companyName}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Client Code: <strong className="font-mono text-slate-800">{receipt.client?.clientCode}</strong>
                    </p>
                    {receipt.client?.contactPerson && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {receipt.client.contactPerson}
                      </p>
                    )}
                    {receipt.client?.phone && (
                      <p className="text-[11px] text-slate-600">{receipt.client.phone}</p>
                    )}
                    {receipt.client?.address && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {receipt.client.address}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#0481A2] tracking-wider block mb-1">
                      From:
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm leading-snug">
                      BRAND 360s PVT LTD
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      AMARIS, 1st Floor, Mogappair East, Chennai – 600107
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Phone: 087781 66492
                    </p>
                    {company.gstin && (
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        GSTIN: {company.gstin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Description Table */}
                <div className="my-5 overflow-hidden rounded-lg border border-slate-200 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1B3260] text-white text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3.5 font-semibold">Description</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-28">Price</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 px-3.5 font-medium text-slate-900">
                          {receipt.invoice
                            ? `Payment received against Invoice ${receipt.invoice.invoiceNumber}`
                            : receipt.installment
                            ? `Payment received against Milestone: ${receipt.installment.title}`
                            : "Payment received on account"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">1</td>
                        <td className="py-3 px-3 text-right font-mono">
                          {formatINR(receipt.amountReceived)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                          {formatINR(receipt.amountReceived)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              {/* Financial Highlight Box */}
              <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Amount Received
                  </span>
                  <div className="text-2xl font-black text-[#243E76] tracking-tight font-mono mt-0.5">
                    {formatINR(receipt.amountReceived)}
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1 italic">
                    {amountInWords}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              {/* Linked Accounts & Balances Reconciliation */}
              {(receipt.invoice || receipt.installment) && (
                <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div className="bg-slate-50 px-3.5 py-2 font-bold text-slate-700 border-b border-slate-200 text-[11px] uppercase tracking-wide">
                    Account Reconciliation & Balances
                  </div>
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {receipt.invoice && (
                        <>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Tax Invoice Number</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#243E76]">
                              {receipt.invoice.invoiceNumber}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Total Invoice Amount</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {formatINR(receipt.invoice.totalAmount)}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Total Paid on Invoice</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatINR(receipt.invoice.amountPaid)}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Remaining Balance Due</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              {formatINR(receipt.invoice.balanceDue)}
                            </td>
                          </tr>
                        </>
                      )}

                      {receipt.installment && !receipt.invoice && (
                        <>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Scheduled Milestone</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {receipt.installment.title} (#{receipt.installment.installmentNumber})
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Milestone Due Date</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {receipt.installment.dueDate}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Milestone Amount Expected</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {formatINR(receipt.installment.amount)}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600">Total Credited on Milestone</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatINR(receipt.installment.amountPaid)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes if applicable */}
              {receipt.notes && (
                <div className="mb-5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                  <p>{receipt.notes}</p>
                </div>
              )}

              {/* Footer Terms & Signatory */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-end text-xs">
                <div className="max-w-xs text-slate-400 text-[10px] space-y-0.5">
                  <p className="font-semibold text-slate-500">Terms & Conditions:</p>
                  <p>1. This receipt is an official acknowledgment of payment received.</p>
                  <p>2. Subject to realization in case of Cheque/Online transfers.</p>
                  <p>3. This is a computer generated receipt; no physical signature required.</p>
                </div>

                <div className="text-right">
                  <div className="h-10 flex items-end justify-end mb-1">
                    <span className="text-[11px] font-mono font-bold text-[#243E76] tracking-wider uppercase">
                      BRAND 360S PVT LTD
                    </span>
                  </div>
                  <div className="w-40 border-t border-slate-300 ml-auto pt-1">
                    <p className="font-bold text-slate-800 text-xs">{company.authorizedSignatory}</p>
                    <p className="text-[10px] text-slate-400">Authorized Signatory</p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
