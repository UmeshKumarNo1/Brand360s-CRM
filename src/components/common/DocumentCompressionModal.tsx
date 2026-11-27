"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Zap,
  Info,
} from "lucide-react";
import {
  DocumentItem,
  formatBytes,
  createDocumentItem,
  compressDocumentItem,
  calculateCompressionSummary,
  CompressionSummary,
} from "@/lib/document-compression";

export interface DocumentCompressionModalProps {
  isOpen: boolean;
  files: File[] | FileList | null;
  onConfirm: (compressedFiles: File[]) => void;
  onCancel: () => void;
  title?: string;
  allowedOverrides?: boolean;
}

type ModalStage = "confirm" | "progress" | "result";

export function DocumentCompressionModal({
  isOpen,
  files,
  onConfirm,
  onCancel,
  title,
  allowedOverrides = true,
}: DocumentCompressionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<ModalStage>("confirm");
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [acceptedOverrides, setAcceptedOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen]);

  // Reset and inspect files whenever `files` prop changes
  useEffect(() => {
    if (!isOpen || !files) {
      setItems([]);
      setStage("confirm");
      setIsProcessing(false);
      setAcceptedOverrides({});
      setOverrideReasons({});
      return;
    }

    let active = true;
    setIsInitializing(true);

    const fileList: File[] = Array.from(files);
    Promise.all(fileList.map((f) => createDocumentItem(f)))
      .then((createdItems) => {
        if (!active) return;
        setItems(createdItems);
        setStage("confirm");
        setIsInitializing(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to inspect documents:", err);
        setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, files]);

  if (!isOpen || !mounted) return null;

  const summary: CompressionSummary = calculateCompressionSummary(items);
  const isMultiple = items.length > 1;

  // Check if every single file is already below target and no errors exist
  const allAlreadyOptimized =
    items.length > 0 &&
    items.every((it) => it.originalSize <= it.targetMaxBytes && it.status !== "error");

  // Handle Starting Compression
  const handleStartCompression = async () => {
    setStage("progress");
    setIsProcessing(true);

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const current = updatedItems[i];
      if (current.status === "error") continue;

      // Update current status to compressing
      updatedItems[i] = {
        ...current,
        status: "compressing",
        progress: 10,
      };
      setItems([...updatedItems]);

      try {
        const compressed = await compressDocumentItem(current, (p) => {
          setItems((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], progress: p };
            return copy;
          });
        });
        updatedItems[i] = compressed;
      } catch (err: any) {
        updatedItems[i] = {
          ...current,
          status: "error",
          errorMessage: err?.message || "Compression failed",
        };
      }

      setItems([...updatedItems]);
    }

    setIsProcessing(false);
    setStage("result");
  };

  // Handle Final Continue Upload
  const handleContinueUpload = () => {
    // Collect final files
    const finalFiles: File[] = [];

    for (const item of items) {
      if (item.status === "error") {
        continue;
      }
      if (item.compressedFile) {
        finalFiles.push(item.compressedFile);
      } else {
        finalFiles.push(item.file);
      }
    }

    if (finalFiles.length === 0) {
      onCancel();
      return;
    }

    onConfirm(finalFiles);
  };

  const handleApplyAchievableSize = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const targetBytes = it.achievableSizeBytes || Math.min(it.originalSize, 450 * 1024);
        const percentSaved = Math.max(
          0,
          Math.round(((it.originalSize - targetBytes) / it.originalSize) * 100)
        );
        return {
          ...it,
          compressedSize: targetBytes,
          percentSaved,
          userAcceptedAchievable: true,
          status: "completed",
        };
      })
    );
    setAcceptedOverrides((prev) => ({ ...prev, [id]: true }));
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 999999 }}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0481A2] flex items-center justify-center">
              <Zap size={18} className="text-[#0481A2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {stage === "confirm" &&
                  (isMultiple ? "Compress Documents Before Upload?" : "Compress Document Before Upload?")}
                {stage === "progress" && "Optimizing Documents..."}
                {stage === "result" && "Document Compression Completed"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {stage === "confirm" && "Automatic size reduction to optimize cloud storage & preserve clarity"}
                {stage === "progress" && "Processing documents locally in browser"}
                {stage === "result" && "Review optimization results before saving to cloud"}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* STAGE 1: CONFIRMATION */}
          {stage === "confirm" && (
            <div className="space-y-4">
              {isInitializing ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-[#0481A2]" />
                  <p className="text-xs">Inspecting selected document{isMultiple ? "s" : ""}...</p>
                </div>
              ) : (
                <>
                  <div className="bg-sky-50/70 border border-sky-200/80 rounded-lg p-3 text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900 text-xs">
                      {allAlreadyOptimized
                        ? "Selected documents are already within target limits."
                        : "The selected document is larger than the recommended upload size."}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {allAlreadyOptimized
                        ? "Files under the threshold are ready for upload without recompression."
                        : "Compressing it reduces storage usage while maintaining complete clarity for official certificates, PAN, Aadhaar, and stamps."}
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] font-semibold text-slate-600">
                      <span>Selected Documents ({items.length})</span>
                      <span>Total: {formatBytes(summary.totalOriginalSize)}</span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {items.map((item) => {
                        const isUnder = item.originalSize <= item.targetMaxBytes;
                        return (
                          <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                {item.isPdf ? (
                                  <FileText size={14} className="text-rose-600" />
                                ) : (
                                  <FileText size={14} className="text-[#0481A2]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-xs truncate max-w-[210px] sm:max-w-[260px]">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500">{item.policyDescription}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-semibold text-slate-800 text-xs">
                                {formatBytes(item.originalSize)}
                              </span>
                              <div className="text-[10px]">
                                {isUnder ? (
                                  <span className="text-emerald-700 font-medium">Already optimal</span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    Target ≤ {formatBytes(item.targetMaxBytes)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STAGE 2: PROGRESS */}
          {stage === "progress" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#0481A2]" />
                  Compressing documents...
                </span>
                <span>
                  {items.filter((i) => i.status === "completed" || i.status === "skipped" || i.status === "warning").length} of {items.length} completed
                </span>
              </div>

              {/* Progress items */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.map((item) => {
                  let badge = (
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Waiting
                    </span>
                  );

                  if (item.status === "compressing") {
                    badge = (
                      <span className="text-[#0481A2] text-[11px] font-semibold flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> {item.progress || 10}%
                      </span>
                    );
                  } else if (item.status === "completed") {
                    badge = (
                      <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Optimized
                      </span>
                    );
                  } else if (item.status === "skipped") {
                    badge = (
                      <span className="text-sky-600 text-[11px] font-medium flex items-center gap-1">
                        Already optimal
                      </span>
                    );
                  } else if (item.status === "warning") {
                    badge = (
                      <span className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> Limit reached
                      </span>
                    );
                  } else if (item.status === "error") {
                    badge = (
                      <span className="text-rose-600 text-[11px] font-medium flex items-center gap-1">
                        Error
                      </span>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 text-xs truncate max-w-[220px]">
                          {item.name}
                        </span>
                      </div>
                      <div className="shrink-0">{badge}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 3: RESULT */}
          {stage === "result" && (
            <div className="space-y-4">
              {/* Savings highlight banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Document Optimization Ready</p>
                    <p className="text-[11px] text-emerald-700">
                      {summary.totalSavedBytes > 0
                        ? `Saved ${formatBytes(summary.totalSavedBytes)} (${summary.overallPercentSaved}% reduction)`
                        : `Preserving maximum clarity & readability`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800">
                    {formatBytes(summary.totalCompressedSize)}
                  </span>
                  {summary.totalSavedBytes > 0 && (
                    <p className="text-[10px] text-emerald-600 line-through">
                      {formatBytes(summary.totalOriginalSize)}
                    </p>
                  )}
                </div>
              </div>

              {/* Table of results */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <th className="py-2 px-3">Document</th>
                      <th className="py-2 px-2 text-right">Before</th>
                      <th className="py-2 px-2 text-right">After</th>
                      <th className="py-2 px-3 text-right">Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 min-w-0">
                          <p className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{item.isPdf ? "PDF" : "Image"}</p>
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-500">
                          {formatBytes(item.originalSize)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                          {formatBytes(item.compressedSize)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.percentSaved > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              -{item.percentSaved}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Optimal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Achievable compression note for documents exceeding strict target */}
              {items.some((it) => it.requiresOverride) && (
                <div className="space-y-3 pt-1">
                  {items
                    .filter((it) => it.requiresOverride)
                    .map((it) => {
                      const isAccepted = acceptedOverrides[it.id] ?? true;
                      const achievableTarget = it.achievableSizeFormatted || "450 KB";
                      return (
                        <div
                          key={it.id}
                          className="bg-sky-50/90 border border-sky-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0481A2] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                              <Zap size={15} />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="font-bold text-slate-900 text-xs">
                                Achievable Document Compression
                              </p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {it.errorMessage ||
                                  `This document cannot be reduced to ${formatBytes(it.targetMaxBytes)} without visual loss.`}
                                <span className="block mt-0.5 font-semibold text-slate-800">
                                  At most, we can compress it to ~{achievableTarget} in KBs while keeping all text & vector graphics sharp.
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="bg-white border border-sky-200/80 rounded-lg p-2.5 flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none min-w-0">
                              <input
                                type="checkbox"
                                checked={isAccepted}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAcceptedOverrides((prev) => ({
                                    ...prev,
                                    [it.id]: checked,
                                  }));
                                  if (checked) {
                                    handleApplyAchievableSize(it.id);
                                  }
                                }}
                                className="w-4 h-4 rounded text-[#0481A2] focus:ring-[#0481A2] cursor-pointer"
                              />
                              <span className="font-semibold text-xs text-slate-800 truncate">
                                Accept compression to ~{achievableTarget}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleApplyAchievableSize(it.id)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0481A2] hover:bg-[#036984] active:bg-[#025267] rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                            >
                              Compress to {achievableTarget}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {stage === "confirm" && (
              <button
                type="button"
                disabled={isInitializing || items.length === 0}
                onClick={handleStartCompression}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0481A2] hover:bg-[#036984] active:bg-[#025267] rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Zap size={14} />
                {allAlreadyOptimized ? "Confirm & Upload" : "Compress & Upload"}
              </button>
            )}

            {stage === "result" && (
              <button
                type="button"
                onClick={handleContinueUpload}
                className="px-4 py-2 text-xs font-bold text-white bg-[#243E76] hover:bg-[#1b2f5b] active:bg-[#142345] rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue Upload</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
