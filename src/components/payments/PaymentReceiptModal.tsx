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
  MessageSquare,
  Send,
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
  const [customPhone, setCustomPhone] = useState("");
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
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
        setCustomPhone(recRes.receipt.client?.phone || "");
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
      setShowWhatsAppInput(false);
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

  const handleOpenMailApp = () => {
    const recNum = receipt?.receiptNumber;
    const recipient = customEmail.trim() || receipt?.client?.email || "";
    const subject = `Payment Receipt ${recNum} | BRAND 360s`;
    const body = `Dear ${receipt?.client?.contactPerson || receipt?.client?.companyName || "Valued Client"},\n\nWe acknowledge receipt of ${formatINR(receipt?.amountReceived || 0)}.\nReceipt No: ${recNum}\nPayment Method: ${receipt?.paymentMethod || "-"}\n\nThank you,\nBRAND 360s`;
    window.open(`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const handleSendWhatsApp = () => {
    const recNum = receipt?.receiptNumber;
    const clientName = receipt?.client?.companyName || "Valued Client";
    const contact = receipt?.client?.contactPerson || clientName;
    const phoneToUse = customPhone.trim() || receipt?.client?.phone || "";

    const msg = [
      `*PAYMENT RECEIPT - BRAND 360s*`,
      ``,
      `Hello *${contact}*,`,
      `We have received and verified your payment. Thank you!`,
      ``,
      `🧾 *Receipt No:* ${recNum}`,
      `🏢 *Client:* ${clientName}`,
      `💵 *Amount Received:* ${formatINR(receipt?.amountReceived || 0)}`,
      `💳 *Payment Method:* ${receipt?.paymentMethod || "-"}`,
      receipt?.transactionRef ? `🔖 *Ref / UTR:* ${receipt.transactionRef}` : null,
      `📅 *Date:* ${receipt?.paymentDate || "-"}`,
      ``,
      `Thank you for your business!`,
      `*BRAND 360s Team*`,
    ].filter(Boolean).join("\n");

    let cleanPhone = phoneToUse.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
                  onClick={() => {
                    setShowWhatsAppInput(!showWhatsAppInput);
                    if (showEmailInput) setShowEmailInput(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Share receipt via WhatsApp"
                >
                  <MessageSquare size={13} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    setShowEmailInput(!showEmailInput);
                    if (showWhatsAppInput) setShowWhatsAppInput(false);
                  }}
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

        {/* WhatsApp Input Bar */}
        {showWhatsAppInput && receipt && (
          <div className="bg-emerald-50/80 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="text-xs font-semibold text-emerald-800">Client WhatsApp Phone:</span>
            <input
              type="text"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="e.g. 9876543210 (10 digits or with +91)"
              className="flex-1 min-w-[200px] max-w-sm px-3 py-1 text-xs border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white text-slate-900"
            />
            <button
              onClick={handleSendWhatsApp}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <MessageSquare size={12} />
              <span>Open WhatsApp</span>
            </button>
          </div>
        )}

        {/* Email Input Bar */}
        {showEmailInput && receipt && (
          <div className="bg-sky-50/80 border-b border-sky-100 px-6 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="text-xs font-semibold text-slate-700">Recipient Email:</span>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="billing@clientcompany.com"
              className="flex-1 min-w-[200px] max-w-sm px-3 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#077EA1] bg-white"
            />
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !customEmail.trim()}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-[#077EA1] hover:bg-[#05607C] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
              <span>Send via Server</span>
            </button>
            <button
              onClick={handleOpenMailApp}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
              title="Open in your default email client (Outlook, Mail, etc.)"
            >
              <Send size={12} />
              <span>Open Mail App</span>
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
              className="bg-white rounded-2xl shadow-sm border border-slate-200/90 w-full max-w-2xl text-slate-800 font-sans relative flex flex-col justify-between h-auto self-start"
            >
              <div>
                {/* 1. Curved #243E76 Brand Header */}
                <div className="relative bg-[#243E76] text-white px-7 pt-6 pb-10 rounded-t-2xl overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <img
                        src="/brand360s-darkmodelogo.svg"
                        alt="BRAND 360s"
                        className="h-10 sm:h-11 w-auto object-contain"
                      />
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-wide uppercase">
                        RECEIPT
                      </h2>
                      <p className="text-xs text-sky-100 font-mono mt-1">
                        Receipt No: <strong className="text-white">{receipt.receiptNumber}</strong>
                      </p>
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 1440 90"
                    className="absolute bottom-0 left-0 w-full h-7 text-white fill-current pointer-events-none"
                    preserveAspectRatio="none"
                  >
                    <path d="M0,32 C360,95 1080,-10 1440,48 L1440,90 L0,90 Z" />
                  </svg>
                </div>

                <div className="px-7 pb-6 pt-3">
                  {/* 2. Receipt To / From */}
                  <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-100 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block mb-1">
                        Receipt To:
                      </span>
                      <p className="font-bold text-slate-900 text-sm leading-snug">
                        {receipt.client?.companyName}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
                        {receipt.client?.clientCode}
                      </p>
                      {receipt.client?.phone && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{receipt.client.phone}</p>
                      )}
                      {receipt.client?.address && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {receipt.client.address}
                        </p>
                      )}
                      {receipt.client?.email && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{receipt.client.email}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-900 block mb-1">
                        From:
                      </span>
                      <p className="font-bold text-slate-900 text-sm leading-snug">
                        {company.name}
                      </p>
                      {settings?.phone && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{settings.phone}</p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {company.address}
                      </p>
                      {settings?.email && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{settings.email}</p>
                      )}
                      {company.gstin && (
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          GSTIN: {company.gstin}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date & Payment Method Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">Receipt Date:</span>{" "}
                      <span>{receipt.paymentDate}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Payment Method:</span>{" "}
                      <span>{receipt.paymentMethod}</span>
                    </div>
                  </div>

                  {/* 3. Payment Description Table */}
                  <div className="mt-1 mb-5 overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#243E76] text-white text-[11px] font-semibold">
                          <th className="py-2.5 px-3.5">Description</th>
                          <th className="py-2.5 px-3 text-center w-16">Qty</th>
                          <th className="py-2.5 px-3 text-right w-28">Unit Price (₹)</th>
                          <th className="py-2.5 px-3.5 text-right w-28">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr className="bg-white">
                          <td className="py-3 px-3.5 font-medium text-slate-900">
                            {receipt.installment
                              ? receipt.installment.title
                              : receipt.invoice
                                ? `Payment towards Invoice ${receipt.invoice.invoiceNumber}`
                                : `Payment Receipt (${receipt.paymentMethod})`}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">1</td>
                          <td className="py-3 px-3 text-right font-mono">
                            {receipt.amountReceived.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">
                            {receipt.amountReceived.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Full-Width Payment Summary & Account Balance */}
                  <div className="mb-4 w-full rounded-lg border border-slate-200 overflow-hidden text-xs">
                    <div className="bg-slate-50 px-3.5 py-2 font-bold text-[#243E76] border-b border-slate-200 text-[11px] uppercase tracking-wide">
                      Payment Summary &amp; Account Balance
                    </div>
                    <div className="divide-y divide-slate-100">
                      {receipt.invoice && (
                        <>
                          <div className="flex justify-between items-center px-3.5 py-2">
                            <span className="text-slate-600 w-3/4">Total Invoice Amount ({receipt.invoice.invoiceNumber})</span>
                            <span className="font-mono font-semibold text-slate-900 w-1/4 text-right">
                              {formatINR(receipt.invoice.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-3.5 py-2">
                            <span className="text-slate-600 w-3/4">Previously Paid</span>
                            <span className="font-mono text-slate-700 w-1/4 text-right">
                              {formatINR(Math.max(0, receipt.invoice.amountPaid - receipt.amountReceived))}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-3.5 py-2">
                            <span className="text-slate-600 w-3/4">Current Payment Received</span>
                            <span className="font-mono font-semibold text-emerald-700 w-1/4 text-right">
                              {formatINR(receipt.amountReceived)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-3.5 py-2">
                            <span className="font-semibold text-slate-800 w-3/4">Total Paid on Invoice</span>
                            <span className="font-mono font-bold text-emerald-700 w-1/4 text-right">
                              {formatINR(receipt.invoice.amountPaid)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-3.5 py-2 bg-rose-50/40">
                            <span className="font-bold text-slate-800 w-3/4">Remaining Balance Due</span>
                            <span className={`font-mono font-bold w-1/4 text-right ${receipt.invoice.balanceDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              {formatINR(receipt.invoice.balanceDue)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center px-3.5 py-2 bg-slate-50/70">
                        <span className="text-slate-600 w-3/4">Subtotal</span>
                        <span className="font-mono font-semibold text-slate-800 w-1/4 text-right">
                          {formatINR(receipt.amountReceived)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center px-3.5 py-2.5 bg-[#243E76] text-white font-bold">
                        <span className="w-3/4">TOTAL RECEIVED</span>
                        <span className="font-mono w-1/4 text-right">{formatINR(receipt.amountReceived)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4b. Amount in Words */}
                  <div className="mb-5 text-xs">
                    <span className="font-bold text-slate-900 block mb-0.5">Amount in Words:</span>
                    <p className="text-slate-600 italic leading-relaxed">{amountInWords}</p>
                  </div>

                  {/* 5. Payment Information & Official Stamp Image */}
                  {(() => {
                    const invBalance = receipt.invoice ? Number(receipt.invoice.balanceDue) : null;
                    const invPaid = receipt.invoice ? Number(receipt.invoice.amountPaid) : 0;
                    const isPartiallyPaid = invBalance !== null && invBalance > 0.009 && invPaid > 0;
                    const stampSrc = isPartiallyPaid ? "/Partially Paid Stamp.png" : "/PAID Stamp.png";
                    const stampAlt = isPartiallyPaid ? "Partially Paid" : "Paid in Full";

                    return (
                      <div className="flex items-center justify-between gap-4 pt-2 pb-2">
                        <div className="text-xs space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-xs mb-2">
                            Payment Information:
                          </h4>
                          {settings?.bank_name && (
                            <p className="text-slate-600">
                              <span className="inline-block w-28 font-semibold text-slate-800">Bank:</span>
                              {settings.bank_name}
                            </p>
                          )}
                          <p className="text-slate-600">
                            <span className="inline-block w-28 font-semibold text-slate-800">Transaction ID:</span>
                            <span className="font-mono">{receipt.transactionRef || "N/A"}</span>
                          </p>
                          {receipt.invoice && (
                            <p className="text-slate-600">
                              <span className="inline-block w-28 font-semibold text-slate-800">Paid For:</span>
                              Invoice: <span className="font-mono text-[#243E76] font-semibold">{receipt.invoice.invoiceNumber}</span>
                            </p>
                          )}
                          {receipt.installment && (
                            <p className="text-slate-600">
                              <span className="inline-block w-28 font-semibold text-slate-800">Payment Towards:</span>
                              {receipt.installment.title}
                            </p>
                          )}
                          <p className="text-slate-600">
                            <span className="inline-block w-28 font-semibold text-slate-800">Recorded By:</span>
                            {receipt.payment.recordedBy || "Staff"}
                          </p>
                        </div>

                        {/* Official Transparent Stamp Asset */}
                        <div className="shrink-0 pr-1">
                          <img
                            src={stampSrc}
                            alt={stampAlt}
                            className="h-24 w-24 sm:h-28 sm:w-28 object-contain select-none"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 7. Footer */}
              <div className="px-7 pb-6 pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
                <div className="max-w-xs text-slate-500 text-[10px] space-y-0.5">
                  <p className="font-bold text-slate-700">Note:</p>
                  <p>This is a computer-generated receipt and is valid without signature.</p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-extrabold italic text-[#243E76] tracking-tight">
                    Thank You!
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">BRAND 360s</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
