"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, Users, X, Loader2 } from "lucide-react";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { reassignClientAction, bulkReassignClientsAction } from "@/app/actions/client-delete";

interface ReassignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (salespersonName: string) => void;
  clientIds: string[];
  clientNames: string[];
  currentSalespersonName?: string;
}

export function ReassignClientModal({
  isOpen,
  onClose,
  onSuccess,
  clientIds,
  clientNames,
  currentSalespersonName,
}: ReassignClientModalProps) {
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      fetchSalespeopleAction()
        .then((data) => {
          setSalespeople(data || []);
          if (data && data.length > 0) {
            setSelectedSalespersonId(data[0].id);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalespersonId) {
      setError("Please choose a salesperson.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const targetPerson = salespeople.find((s) => s.id === selectedSalespersonId);
    const targetName = targetPerson?.full_name || "New Salesperson";

    try {
      if (clientIds.length === 1) {
        const res = await reassignClientAction(clientIds[0], selectedSalespersonId);
        if (res.success) {
          onSuccess(targetName);
          onClose();
        } else {
          setError(res.error || "Failed to reassign client.");
        }
      } else {
        const res = await bulkReassignClientsAction(clientIds, selectedSalespersonId);
        if (res.success) {
          onSuccess(targetName);
          onClose();
        } else {
          setError(res.error || "Failed to bulk reassign clients.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during reassignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-start gap-3 border-b border-slate-100 bg-[#F0F8FA]">
          <div className="p-2.5 bg-[#E0F2F7] text-[#0481A2] rounded-xl shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {clientIds.length > 1 ? `Reassign ${clientIds.length} Clients` : "Reassign Salesperson"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {clientIds.length === 1 ? clientNames[0] : `${clientNames.slice(0, 2).join(", ")} and others`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
              {error}
            </div>
          )}

          {currentSalespersonName && clientIds.length === 1 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-600">
              <span>Current Salesperson:</span>
              <span className="font-semibold text-slate-800">{currentSalespersonName}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-slate-700 font-medium">
              Select New Sales Representative *
            </label>
            {isLoading ? (
              <div className="p-3 text-center text-slate-400">Loading sales representatives...</div>
            ) : (
              <select
                value={selectedSalespersonId}
                onChange={(e) => setSelectedSalespersonId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {salespeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role === "admin" ? "Admin" : "Sales"})
                    {p.is_active === false ? " - Inactive" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              The assigned salesperson will receive pipeline visibility and responsibility for client communications.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} />
                  <span>Confirm Reassignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

