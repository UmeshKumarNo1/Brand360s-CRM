"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Archive, Loader2, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  recordName: string;
  consequences: string;
  isArchivingOnly?: boolean;
  archiveOption?: {
    label: string;
    onArchive: () => Promise<void> | void;
  };
  requireMatchInput?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  recordName,
  consequences,
  isArchivingOnly = false,
  archiveOption,
  requireMatchInput = false,
}: DeleteConfirmationModalProps) {
  const [matchInput, setMatchInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireMatchInput && matchInput.trim().toLowerCase() !== recordName.trim().toLowerCase()) {
      setError(`Please type "${recordName}" to confirm.`);
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to complete delete action.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveOption) return;
    setError(null);
    setIsArchiving(true);
    try {
      await archiveOption.onArchive();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to archive record.");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-start gap-3 border-b border-slate-100 bg-red-50/40">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Target: <span className="font-semibold text-slate-800">{recordName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting || isArchiving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-slate-800">Consequences & Warning:</p>
            <p>{consequences}</p>
          </div>

          {requireMatchInput && !isArchivingOnly && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-slate-700 font-medium">
                To confirm, type <span className="font-bold select-all text-slate-900">"{recordName}"</span> below:
              </label>
              <input
                type="text"
                value={matchInput}
                onChange={(e) => setMatchInput(e.target.value)}
                placeholder={recordName}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting || isArchiving}
            className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {/* Optional Archive / Deactivate button */}
          {archiveOption && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isDeleting || isArchiving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {isArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
              <span>{archiveOption.label}</span>
            </button>
          )}

          {!isArchivingOnly && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                isDeleting ||
                isArchiving ||
                (requireMatchInput && matchInput.trim().toLowerCase() !== recordName.trim().toLowerCase())
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Delete Permanently</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

