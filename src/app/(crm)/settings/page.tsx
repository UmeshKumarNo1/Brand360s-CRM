"use client";

import { useEffect, useState, useActionState } from "react";
import { Building2, Save, Loader2, Landmark, FileText, CheckCircle2 } from "lucide-react";
import { fetchCrmSettingsAction, updateCrmSettingsAction } from "@/app/actions/settings";
import { useToast } from "@/components/common/ToastProvider";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error: toastError } = useToast();

  const [state, formAction, isPending] = useActionState(updateCrmSettingsAction, null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCrmSettingsAction();
      setSettings(data);
    } catch {
      toastError("Failed to load settings", "Could not fetch company settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (state?.success) {
      success("Settings Saved", "Company billing details updated successfully.");
      loadSettings();
    } else if (state?.error) {
      toastError("Update Failed", state.error);
    }
  }, [state, success, toastError]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="pb-4 border-b border-[#E2E8F0]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Company & Billing Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure enterprise branding, GSTIN, PAN, bank settlement accounts, and invoice terms.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <Loader2 size={18} className="animate-spin text-[#077EA1] mx-auto mb-2" />
          <span>Loading settings...</span>
        </div>
      ) : (
        <form action={formAction} className="space-y-6">
          {/* Section 1: Business Identity & GST */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 size={18} className="text-[#077EA1]" />
              <h3 className="text-sm font-bold text-slate-900">Company Information & Tax Registration</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Legal Name *</label>
                <input
                  name="company_name"
                  required
                  defaultValue={settings?.company_name || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CIN (Corporate ID Number)</label>
                <input
                  name="cin"
                  defaultValue={settings?.cin || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number *</label>
                <input
                  name="gstin"
                  required
                  defaultValue={settings?.gstin || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">PAN Number *</label>
                <input
                  name="pan"
                  required
                  defaultValue={settings?.pan || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Registered Office Address *</label>
                <textarea
                  name="company_address"
                  required
                  rows={2}
                  defaultValue={settings?.company_address || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bank & Settlement Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Landmark size={18} className="text-[#077EA1]" />
              <h3 className="text-sm font-bold text-slate-900">Bank Settlement & UPI</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  name="bank_name"
                  defaultValue={settings?.bank_name || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  name="account_holder_name"
                  defaultValue={settings?.account_holder_name || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  name="account_number"
                  defaultValue={settings?.account_number || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  name="ifsc"
                  defaultValue={settings?.ifsc || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI ID / VPA</label>
                <input
                  name="upi_id"
                  defaultValue={settings?.upi_id || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                <input
                  name="authorized_signatory"
                  defaultValue={settings?.authorized_signatory || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Invoice Terms & Defaults */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText size={18} className="text-[#077EA1]" />
              <h3 className="text-sm font-bold text-slate-900">Invoice Defaults & Terms</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
                <input
                  name="default_gst_rate"
                  type="number"
                  defaultValue={settings?.default_gst_rate ?? 18}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Payment Terms</label>
                <input
                  name="default_payment_terms"
                  defaultValue={settings?.default_payment_terms || "Due on Receipt"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Payment Instructions</label>
                <input
                  name="payment_instructions"
                  defaultValue={settings?.payment_instructions || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  name="terms_conditions"
                  rows={3}
                  defaultValue={settings?.terms_conditions || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Billing Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
