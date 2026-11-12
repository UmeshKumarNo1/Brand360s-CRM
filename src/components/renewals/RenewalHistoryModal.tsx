"use client";

import { useState, useEffect } from "react";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";
import { fetchRenewalHistoryAction, RenewalHistoryRecord } from "@/app/actions/renewals";
import { X, History, FileText, Calendar, Loader2 } from "lucide-react";

interface RenewalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string;
  serviceName?: string;
  clientName?: string;
  onPreviewInvoice?: (invoiceId: string) => void;
}

export function RenewalHistoryModal({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  clientName,
  onPreviewInvoice,
}: RenewalHistoryModalProps) {
  const [history, setHistory] = useState<RenewalHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error: toastError } = useToast();

  useEffect(() => {
    if (!isOpen || !serviceId) return;

    setIsLoading(true);
    fetchRenewalHistoryAction(serviceId)
      .then((data) => setHistory(data))
      .catch((err) => toastError("Error", "Could not load renewal history."))
      .finally(() => setIsLoading(false));
  }, [isOpen, serviceId, toastError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#243E76] text-white">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#0481A2]" />
            <div>
              <h2 className="text-sm font-bold">Renewal Audit History</h2>
              <p className="text-[11px] text-slate-300">
                {serviceName || "Service"} • {clientName || "Client"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={24} className="animate-spin text-[#0481A2]" />
              <p className="text-xs">Loading history records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              <Calendar size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No previous renewal records</p>
              <p className="text-slate-400 mt-0.5">
                Each completed renewal cycle is logged here with its start/end dates, amount, and invoice reference.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{formatINR(record.renewalAmount)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {record.renewalStatus}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Period: <span className="font-medium text-slate-700">{record.renewalStartDate}</span> to{" "}
                      <span className="font-medium text-slate-700">{record.renewalEndDate}</span>
                    </div>
                    {record.notes && (
                      <div className="text-slate-600 text-[11px] italic">"{record.notes}"</div>
                    )}
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between items-center text-[11px] text-slate-500 gap-1.5 shrink-0">
                    <div>
                      Logged on {record.createdAt.split("T")[0]} by {record.createdByName}
                    </div>
                    {record.invoiceId && (
                      <button
                        onClick={() => {
                          if (onPreviewInvoice && record.invoiceId) {
                            onPreviewInvoice(record.invoiceId);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-sky-50 text-[#0481A2] hover:bg-[#0481A2] hover:text-white rounded-md border border-sky-200 transition-colors cursor-pointer font-mono"
                      >
                        <FileText size={11} />
                        <span>{record.invoiceNumber || "View Invoice"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

