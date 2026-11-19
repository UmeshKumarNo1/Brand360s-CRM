"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  Loader2,
  Send,
  History,
  TrendingUp,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";
import {
  fetchServiceStageDetailsAction,
  updateServiceFulfillmentStageAction,
  StageManagementData,
} from "@/app/actions/fulfillment";
import { ServiceFulfillmentTimeline } from "@/components/services/ServiceFulfillmentTimeline";

interface ServiceStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string | null;
  onSuccess?: () => void;
}

export function ServiceStageModal({
  isOpen,
  onClose,
  serviceId,
  onSuccess,
}: ServiceStageModalProps) {
  const [data, setData] = useState<StageManagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedRevertIndex, setSelectedRevertIndex] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"stages" | "history">("stages");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const reqIdRef = useRef(0);

  const loadDetails = () => {
    if (!serviceId) return;
    const curId = ++reqIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    fetchServiceStageDetailsAction(serviceId)
      .then((res) => {
        if (curId === reqIdRef.current) {
          setData(res);
        }
      })
      .catch((err) => {
        if (curId === reqIdRef.current) {
          setErrorMessage(err.message || "Failed to load service stage details.");
        }
      })
      .finally(() => {
        if (curId === reqIdRef.current) {
          setIsLoading(false);
        }
      });
  };

  useEffect(() => {
    if (isOpen && serviceId) {
      loadDetails();
      setNotes("");
      setSelectedRevertIndex(null);
      setActiveSubTab("stages");
    } else {
      setData(null);
      setErrorMessage(null);
    }
  }, [isOpen, serviceId]);

  if (!isOpen || !serviceId) return null;

  const handleAdvanceStage = async () => {
    if (!serviceId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateServiceFulfillmentStageAction({
        serviceId,
        action: "ADVANCE",
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        success("Stage Advanced", "Service successfully moved to the next fulfillment milestone.");
        setNotes("");
        loadDetails();
        onSuccess?.();
      } else {
        setErrorMessage(res.error || "Failed to advance stage.");
        toastError("Stage Transition Error", res.error || "Failed to advance stage.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteService = async () => {
    if (!serviceId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateServiceFulfillmentStageAction({
        serviceId,
        action: "COMPLETE",
        notes: notes.trim() || "Completed all fulfillment deliverables",
      });

      if (res.success) {
        success("Service Completed", "All milestones marked as completed.");
        setNotes("");
        loadDetails();
        onSuccess?.();
      } else {
        setErrorMessage(res.error || "Failed to complete service.");
        toastError("Completion Error", res.error || "Failed to complete service.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertStage = async (targetIndex: number) => {
    if (!serviceId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateServiceFulfillmentStageAction({
        serviceId,
        action: "REVERT",
        targetStageIndex: targetIndex,
        notes: notes.trim() || `Stage reverted by administrator`,
      });

      if (res.success) {
        success("Stage Reverted", "Milestone corrected and stage updated.");
        setSelectedRevertIndex(null);
        setNotes("");
        loadDetails();
        onSuccess?.();
      } else {
        setErrorMessage(res.error || "Failed to revert stage.");
        toastError("Reversion Error", res.error || "Failed to revert stage.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNoteOnly = async () => {
    if (!serviceId || !notes.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateServiceFulfillmentStageAction({
        serviceId,
        action: "NOTE",
        notes: notes.trim(),
      });

      if (res.success) {
        success("Progress Note Logged", "Remark added to fulfillment history.");
        setNotes("");
        loadDetails();
        onSuccess?.();
      } else {
        setErrorMessage(res.error || "Failed to log note.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentIdx = data?.stages.findIndex((s) => s.status === "current") ?? -1;
  const isAllComplete = data?.progressPercentage === 100 || data?.serviceStatus === "Completed";
  const nextStage =
    currentIdx !== -1 && currentIdx < (data?.stages.length || 0) - 1
      ? data?.stages[currentIdx + 1]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-sky-50/50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {data?.serviceName || "Service Fulfillment"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-[#0481A2] border border-sky-200 shrink-0">
                {data?.serviceCategory}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <strong className="text-slate-800 font-semibold">{data?.clientName}</strong> • Assigned: <span className="text-slate-700">{data?.assignedEmployeeName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 size={24} className="animate-spin text-[#0481A2] mx-auto mb-2" />
            <p className="text-xs font-medium">Loading milestone progression...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Top Status Card */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Current Active Milestone
                </span>
                <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  {isAllComplete ? "Completed" : data?.currentStageName}
                </p>
                <p className="text-xs text-slate-500">
                  {data?.currentStageDescription || (isAllComplete ? "All deliverables marked as completed" : "Work currently in progress")}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Progress
                </span>
                <span className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-sans font-number mt-1",
                  isAllComplete ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                )}>
                  {data?.progressPercentage}%
                </span>
              </div>
            </div>

            {/* Stepper Visualization */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-xs text-slate-900">Sequential Fulfillment Stages</h4>
                <span className="text-[11px] text-slate-400">Step progression</span>
              </div>

              {/* Horizontal Stepper */}
              <div className="py-4 px-2">
                <ServiceFulfillmentTimeline
                  stages={data?.stages || []}
                  currentStageName={data?.currentStageName}
                  progressPercentage={data?.progressPercentage}
                  interactive={Boolean(data?.isAdmin)}
                  onStageClick={(idx) => {
                    if (data?.isAdmin && idx !== currentIdx) {
                      setSelectedRevertIndex(idx);
                    }
                  }}
                  size="md"
                />
              </div>

              {/* Admin stage correction alert if a stage was clicked */}
              {selectedRevertIndex !== null && data?.isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                    <span>
                      Set stage directly to: <strong>{data.stages[selectedRevertIndex]?.name}</strong>?
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRevertStage(selectedRevertIndex)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[11px] cursor-pointer"
                    >
                      Confirm Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRevertIndex(null)}
                      className="text-slate-500 hover:text-slate-700 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs for Stage Actions vs History */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubTab("stages")}
                className={cn(
                  "pb-2.5 px-3 border-b-2 cursor-pointer transition-colors",
                  activeSubTab === "stages"
                    ? "border-[#0481A2] text-[#0481A2]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                Stage Actions &amp; Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("history")}
                className={cn(
                  "pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5",
                  activeSubTab === "history"
                    ? "border-[#0481A2] text-[#0481A2]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <History size={13} />
                <span>Audit History ({data?.history.length || 0})</span>
              </button>
            </div>

            {activeSubTab === "stages" && (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!isAllComplete ? (
                    <button
                      type="button"
                      onClick={handleAdvanceStage}
                      disabled={isSubmitting || !data?.canManage}
                      className="px-4 py-3 bg-[#0481A2] hover:bg-[#036c88] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      <span>
                        {nextStage ? `Complete & Move to "${nextStage.name}"` : "Complete Final Stage"}
                      </span>
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Fulfillment deliverable is 100% completed.</span>
                    </div>
                  )}

                  {!isAllComplete && (
                    <button
                      type="button"
                      onClick={handleCompleteService}
                      disabled={isSubmitting || !data?.canManage}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>Mark Deliverable as Fully Completed</span>
                    </button>
                  )}
                </div>

                {/* Progress Remark Input */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Progress Note / Milestone Remark (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter notes about documents verified, filings submitted, or remarks..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0481A2] focus:border-transparent bg-white resize-none"
                  />
                  {notes.trim() && (
                    <button
                      type="button"
                      onClick={handleAddNoteOnly}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Send size={12} />
                      <span>Log Note to Audit History</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSubTab === "history" && (
              <div className="space-y-3">
                {(!data?.history || data.history.length === 0) ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No stage transitions logged yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {data.history.map((h) => (
                      <div key={h.id} className="relative text-xs flex items-start gap-3">
                        <div className={cn(
                          "absolute -left-6 top-1 w-3 h-3 rounded-full ring-4 ring-white",
                          h.action_type === "COMPLETE" ? "bg-emerald-500" : h.action_type === "REVERT" ? "bg-amber-500" : "bg-[#0481A2]"
                        )} />
                        <div className="flex-1 bg-slate-50/80 border border-slate-200/80 p-3 rounded-xl space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {h.previous_stage ? `${h.previous_stage} → ${h.new_stage}` : h.new_stage}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans font-number">
                              {new Date(h.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Action: <strong className="font-semibold text-slate-800">{h.action_type}</strong> • By: <span className="text-slate-700">{h.updater_name}</span>
                          </p>
                          {h.notes && (
                            <p className="text-slate-600 italic text-[11px] pt-1 border-t border-slate-200/60">
                              "{h.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">Fulfillment progress is tracked independently from invoicing.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

