"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Layers, X, Loader2, IndianRupee, RefreshCw } from "lucide-react";
import { createCatalogServiceAction } from "@/app/actions/services";
import { useToast } from "@/components/common/ToastProvider";

interface AddCatalogServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCatalogServiceModal({ isOpen, onClose, onSuccess }: AddCatalogServiceModalProps) {
  const [state, formAction, isPending] = useActionState(createCatalogServiceAction, null);
  const [isRenewable, setIsRenewable] = useState(false);
  const [renewalFrequency, setRenewalFrequency] = useState<string>("Annually");
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success("Service added to catalog", "New service offering created successfully.");
      onSuccess();
      onClose();
    } else if (state.error) {
      toastError("Failed to add service", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Service to Catalog</h3>
              <p className="text-[11px] text-slate-500">Define standard service offering & pricing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form action={formAction} className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
            <input
              name="name"
              required
              type="text"
              placeholder="e.g. Private Limited Company Registration"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              name="category"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
            >
              <option value="Business Registration">Business Registration</option>
              <option value="Compliance & Tax">Compliance & Tax</option>
              <option value="Intellectual Property & Legal">Intellectual Property & Legal</option>
              <option value="Branding & Web Development">Branding & Web Development</option>
              <option value="Digital Growth & Visibility">Digital Growth & Visibility</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fulfillment Workflow Template</label>
            <select
              name="workflow_preset"
              defaultValue=""
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
            >
              <option value="">Auto-Detect from Name &amp; Category</option>
              <option value="website">Website Development (5 stages)</option>
              <option value="smm">Social Media Marketing (6 stages)</option>
              <option value="trademark">Trademark Filing (6 stages)</option>
              <option value="incorporation">Company Registration (6 stages)</option>
              <option value="gst">GST Registration (5 stages)</option>
              <option value="compliance">Annual Compliance (5 stages)</option>
              <option value="general">General Service (5 stages)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Service Fee (₹)</label>
              <input
                name="default_service_fee"
                type="number"
                step="any"
                placeholder="15000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Govt Fee (₹)</label>
              <input
                name="default_govt_fee"
                type="number"
                step="any"
                placeholder="5000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Description</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Scope of work, deliverables, and typical requirements..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Renewable Service Configuration */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-[#0481A2]" />
                <span className="font-bold text-slate-800 text-xs">Renewable Subscription Service</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_renewable"
                  value="true"
                  checked={isRenewable}
                  onChange={(e) => setIsRenewable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0481A2]"></div>
              </label>
            </div>

            {isRenewable && (
              <div className="pt-2 border-t border-slate-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Renewal Frequency</label>
                    <select
                      name="renewal_frequency"
                      value={renewalFrequency}
                      onChange={(e) => {
                        const freq = e.target.value;
                        setRenewalFrequency(freq);
                        if (freq === "Monthly") setDurationMonths(1);
                        else if (freq === "Quarterly") setDurationMonths(3);
                        else if (freq === "Half-Yearly") setDurationMonths(6);
                        else if (freq === "Annually") setDurationMonths(12);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs"
                    >
                      <option value="Monthly">Monthly (1 Month)</option>
                      <option value="Quarterly">Quarterly (3 Months)</option>
                      <option value="Half-Yearly">Half-Yearly (6 Months)</option>
                      <option value="Annually">Annually (12 Months)</option>
                      <option value="Custom">Custom Duration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                    <input
                      name="renewal_duration_months"
                      type="number"
                      min={1}
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Renewal Amount (₹)</label>
                    <input
                      name="default_renewal_amount"
                      type="number"
                      step="any"
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reminder Alert (Days Before)</label>
                    <input
                      name="default_reminder_days"
                      type="number"
                      min={0}
                      defaultValue={30}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Adding Service...</span>
                </>
              ) : (
                <span>Add to Catalog</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
