"use client";

import { useState, useEffect } from "react";
import { Layers, X, Loader2, RefreshCw } from "lucide-react";
import { updateCatalogServiceAction } from "@/app/actions/services";
import { useToast } from "@/components/common/ToastProvider";
import { RenewalFrequency } from "@/lib/renewals/renewal-dates";

interface EditCatalogServiceModalProps {
  service: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCatalogServiceModal({
  service,
  isOpen,
  onClose,
  onSuccess,
}: EditCatalogServiceModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [defaultServiceFee, setDefaultServiceFee] = useState<number | string>(0);
  const [defaultGovtFee, setDefaultGovtFee] = useState<number | string>(0);
  const [workflowPreset, setWorkflowPreset] = useState("");
  const [isRenewable, setIsRenewable] = useState(false);
  const [renewalFrequency, setRenewalFrequency] = useState<RenewalFrequency>("Annually");
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [defaultRenewalAmount, setDefaultRenewalAmount] = useState<number | string>(0);
  const [defaultReminderDays, setDefaultReminderDays] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (service) {
      setName(service.name || "");
      setCategory(service.category || "General");
      setDescription(service.description || "");
      setDefaultServiceFee(service.default_service_fee || 0);
      setDefaultGovtFee(service.default_govt_fee || 0);
      setWorkflowPreset(service.workflow_preset || "");
      setIsRenewable(Boolean(service.is_renewable));
      setRenewalFrequency((service.renewal_frequency as RenewalFrequency) || "Annually");
      setDurationMonths(service.renewal_duration_months || 12);
      setDefaultRenewalAmount(service.default_renewal_amount || service.default_service_fee || 0);
      setDefaultReminderDays(service.default_reminder_days || 30);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await updateCatalogServiceAction(service.id, {
        name,
        category,
        description: description || null,
        default_service_fee: parseFloat(String(defaultServiceFee)) || 0,
        default_govt_fee: parseFloat(String(defaultGovtFee)) || 0,
        workflow_preset: workflowPreset || null,
        is_renewable: isRenewable,
        renewal_frequency: isRenewable ? renewalFrequency : null,
        renewal_duration_months: isRenewable ? durationMonths : null,
        default_renewal_amount: isRenewable ? parseFloat(String(defaultRenewalAmount)) || 0 : null,
        default_reminder_days: isRenewable ? defaultReminderDays : null,
      });

      if (res.success) {
        success("Catalog Service Updated", `${name} updated successfully.`);
        onSuccess();
        onClose();
      } else {
        toastError("Update Failed", res.error || "Could not update service.");
      }
    } catch {
      toastError("Error", "Network connection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Catalog Service</h3>
              <p className="text-[11px] text-slate-500">Modify service offering, pricing &amp; renewal model</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Service Fee (₹)</label>
              <input
                type="number"
                step="any"
                value={defaultServiceFee}
                onChange={(e) => setDefaultServiceFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Govt Fee (₹)</label>
              <input
                type="number"
                step="any"
                value={defaultGovtFee}
                onChange={(e) => setDefaultGovtFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope of work, deliverables, and typical requirements..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Renewable Subscription Configuration */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-[#0481A2]" />
                <span className="font-bold text-slate-800 text-xs">Renewable Subscription Service</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
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
                      value={renewalFrequency}
                      onChange={(e) => {
                        const freq = e.target.value as RenewalFrequency;
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
                      type="number"
                      step="any"
                      value={defaultRenewalAmount}
                      onChange={(e) => setDefaultRenewalAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reminder Alert (Days Before)</label>
                    <input
                      type="number"
                      min={0}
                      value={defaultReminderDays}
                      onChange={(e) => setDefaultReminderDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
              disabled={isSubmitting}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
