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
              className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden w-full max-w-2xl text-slate-800 font-sans relative flex flex-col justify-between"
              style={{ minHeight: "780px" }}
            >
              {/* Curved Navy & Teal Wave Header */}
              <div className="relative bg-[#0E2A5C] text-white px-7 pt-6 pb-10 overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <img
                      src="/brand360s-darkmodelogo.svg"
                      alt="BRAND 360s"
                      className="h-9 sm:h-10 w-auto object-contain mb-3"
                    />
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">
                      PAYMENT RECEIPT
                    </h2>
                  </div>
                  <div className="text-right pt-1">
                    <span className="text-xs font-semibold text-sky-200">
                      Receipt No.:{" "}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-white">
                      {receipt.receiptNumber}
                    </span>
                  </div>
                </div>
                <svg
                  viewBox="0 0 1440 120"
                  preserveAspectRatio="none"
                  className="absolute bottom-0 left-0 w-full h-10 pointer-events-none"
                >
                  <path
                    d="M0,40 C360,110 1080,0 1440,60 L1440,120 L0,120 Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>

              <div className="px-7 py-5 flex-1">
                {/* Received From (Left) & From (Right) */}
                <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200 text-xs">
                  <div className="pr-4 border-r border-slate-200">
                    <span className="text-[11px] font-bold text-slate-900 block mb-1">
                      Received From:
                    </span>
                    <p className="font-bold text-slate-900 text-sm leading-snug">
                      {receipt.client?.companyName}
                    </p>
                    {receipt.client?.contactPerson && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Attn: {receipt.client.contactPerson}
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

                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block mb-1">
                      From:
                    </span>
                    <p className="font-bold text-slate-900 text-sm leading-snug">
                      {company.name || "BRAND 360s PRIVATE LIMITED"}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {company.address || "AMARIS, 1st Floor, Mogappair East, Chennai – 600107"}
                    </p>
                    {(company.gstin || (company as any).cin) && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        {company.gstin ? `GSTIN: ${company.gstin}` : ""}
                        {company.gstin && (company as any).cin ? " | " : ""}
                        {(company as any).cin ? `CIN: ${(company as any).cin}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Receipt Date & Against Invoice */}
                <div className="flex justify-between items-center py-3 text-xs text-slate-700">
                  <div>
                    <strong className="text-slate-900">Receipt Date:</strong>{" "}
                    <span>{receipt.paymentDate}</span>
                  </div>
                  {receipt.invoice && (
                    <div>
                      <strong className="text-slate-900">Against Invoice:</strong>{" "}
                      <span className="font-mono font-semibold text-[#0E2A5C]">
                        {receipt.invoice.invoiceNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Description Table */}
                <div className="my-2 overflow-hidden rounded-md border border-slate-300 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0E2A5C] text-white text-[11px] font-semibold">
                        <th className="py-2.5 px-3.5">Description</th>
                        <th className="py-2.5 px-3 text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 text-right w-28">Price (₹)</th>
                        <th className="py-2.5 px-3.5 text-right w-28">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr>
                        <td className="py-3 px-3.5 font-medium">
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
                        <td className="py-3 px-3.5 text-right font-mono font-semibold">
                          {formatINR(receipt.amountReceived)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total Amount Received Bar */}
                <div className="flex justify-end my-3">
                  <div className="inline-flex rounded-md overflow-hidden border border-slate-200 text-xs">
                    <div className="bg-[#0E2A5C] text-white font-bold px-5 py-2 flex items-center">
                      Total Amount Received
                    </div>
                    <div className="bg-sky-50 text-[#0E2A5C] font-extrabold font-mono px-5 py-2 text-sm flex items-center">
                      {formatINR(receipt.amountReceived)}
                    </div>
                  </div>
                </div>

                {/* Amount in Words */}
                <div className="my-3">
                  <span className="text-xs font-bold text-slate-900 block mb-1">
                    Amount in Words:
                  </span>
                  <div className="bg-sky-50/90 border border-sky-100 rounded-md px-3.5 py-2 text-xs font-semibold text-slate-800">
                    {amountInWords}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="my-4 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block mb-1">
                    Payment Information:
                  </span>
                  <div className="grid grid-cols-[140px_1fr] gap-y-1">
                    <span className="text-slate-600">Payment Mode</span>
                    <span>: <strong className="text-slate-900">{receipt.paymentMethod}</strong></span>
                    {receipt.transactionRef && (
                      <>
                        <span className="text-slate-600">Transaction Ref. No.</span>
                        <span>: <strong className="font-mono text-slate-900">{receipt.transactionRef}</strong></span>
                      </>
                    )}
                    <span className="text-slate-600">Transaction Date</span>
                    <span>: <strong className="text-slate-900">{receipt.paymentDate}</strong></span>
                  </div>
                </div>

                {/* Note & Thank You */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
                  <div className="max-w-sm text-slate-600 text-[10px] space-y-0.5">
                    <p className="font-bold text-[#0E2A5C] text-xs mb-1">Note:</p>
                    <p>• This receipt is computer generated and does not require a physical signature.</p>
                    <p>• This is an acknowledgement of payment received against the above invoice.</p>
                  </div>
                  <div className="text-right pl-6 border-l border-slate-200">
                    <p className="text-xl font-bold italic text-[#0E2A5C] tracking-tight">
                      Thank You!
                    </p>
                  </div>
                </div>
              </div>

              {/* Matching Curved Navy & Teal Wave Footer */}
              <div className="relative h-8 bg-[#0E2A5C] overflow-hidden">
                <svg
                  viewBox="0 0 1440 120"
                  preserveAspectRatio="none"
                  className="absolute top-0 left-0 w-full h-8 pointer-events-none"
                >
                  <path
                    d="M0,0 L1440,0 L1440,40 C1080,100 360,10 0,70 Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
