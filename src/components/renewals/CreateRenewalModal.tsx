"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";
import { createManualRenewalAction } from "@/app/actions/renewals";
import { useToast } from "@/components/common/ToastProvider";
import { X, CalendarPlus, Loader2, Calendar, IndianRupee, FileText } from "lucide-react";

interface CreateRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: { id: string; name: string }[];
  services: { id: string; clientId: string; name: string; amount: number; expiry: string }[];
}

export function CreateRenewalModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  services,
}: CreateRenewalModalProps) {
  const { success, error: toastError } = useToast();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [renewalStartDate, setRenewalStartDate] = useState(new Date().toISOString().split("T")[0]);

  const defaultNextDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };

  const [newRenewalDate, setNewRenewalDate] = useState(defaultNextDate());
  const [renewalAmount, setRenewalAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available services for the selected client
  const availableServices = services.filter((s) => s.clientId === selectedClientId);

  const handleClientChange = (cId: string) => {
    setSelectedClientId(cId);
    setSelectedServiceId("");
    setRenewalAmount(0);
  };

  const handleServiceChange = (sId: string) => {
    setSelectedServiceId(sId);
    const found = services.find((s) => s.id === sId);
    if (found) {
      if (found.amount) setRenewalAmount(found.amount);
      if (found.expiry && found.expiry !== "-") {
        setRenewalStartDate(found.expiry);
        try {
          const d = new Date(found.expiry);
          d.setFullYear(d.getFullYear() + 1);
          setNewRenewalDate(d.toISOString().split("T")[0]);
        } catch {}
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedServiceId) {
      toastError("Validation Error", "Please select both a client and a service.");
      return;
    }

    if (new Date(newRenewalDate) <= new Date(renewalStartDate)) {
      toastError("Validation Error", "Renewal end date must be after the renewal start date.");
      return;
    }

    if (Number(renewalAmount) < 0) {
      toastError("Validation Error", "Renewal amount cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createManualRenewalAction(
        selectedClientId,
        selectedServiceId,
        renewalStartDate,
        newRenewalDate,
        Number(renewalAmount) || 0,
        notes,
        createInvoice
      );

      if (res.success) {
        success("Renewal Created", "Pending service renewal created successfully.");
        onSuccess();
        onClose();
      } else {
        toastError("Failed", res.error || "Could not create renewal.");
      }
    } catch {
      toastError("Error", "Network connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#243E76] text-white">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-[#0481A2]" />
            <h2 className="text-sm font-bold">Create Service Renewal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Client Select */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Client *</label>
            <select
              required
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2] bg-white text-slate-700 cursor-pointer"
            >
              <option value="">-- Choose Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Select */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Client Service *</label>
            <select
              required
              disabled={!selectedClientId}
              value={selectedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2] bg-white text-slate-700 cursor-pointer disabled:bg-slate-50"
            >
              <option value="">
                {selectedClientId
                  ? availableServices.length > 0
                    ? "-- Choose Service --"
                    : "No active services found for this client"
                  : "-- First Select a Client --"}
              </option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Exp: {s.expiry})
                </option>
              ))}
            </select>
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={renewalStartDate}
                onChange={(e) => setRenewalStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Expiry *</label>
              <input
                type="date"
                required
                value={newRenewalDate}
                onChange={(e) => setNewRenewalDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Renewal Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Renewal Amount (₹) *</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={renewalAmount}
              onChange={(e) => setRenewalAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Renewal Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 1-year annual compliance renewal agreed via email..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Create Invoice Checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Generate Renewal Invoice</div>
              <div className="text-[11px] text-slate-400">Creates a formal billing invoice record</div>
            </div>
            <input
              type="checkbox"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              className="w-4 h-4 text-[#0481A2] rounded-md focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedClientId || !selectedServiceId}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Renewal Record</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

