"use client";

import React, { useState } from "react";
import { Check, X, Building2, User, Phone, Mail, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { convertLeadToClientAction } from "@/app/actions/leads";
import { useToast } from "@/components/common/ToastProvider";

export function ConvertLeadModal({ isOpen, onClose, lead, onSuccess }) {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState(lead?.companyName || "");
  const [contactPerson, setContactPerson] = useState(lead?.contactPerson || "");
  const [phone, setPhone] = useState(lead?.phone !== "-" ? lead?.phone : "");
  const [email, setEmail] = useState(lead?.email !== "-" ? lead?.email : "");
  const [address, setAddress] = useState(lead?.address !== "-" ? lead?.address : "");
  const [city, setCity] = useState(lead?.city !== "-" ? lead?.city : "");
  const [state, setState] = useState(lead?.state !== "-" ? lead?.state : "Tamil Nadu");
  const [pincode, setPincode] = useState("600001");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");

  if (!isOpen || !lead) return null;

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toastError("Validation Error", "Company Legal Name is required.");
      return;
    }
    if (!contactPerson.trim()) {
      toastError("Validation Error", "Primary Contact Person is required.");
      return;
    }
    if (!phone.trim()) {
      toastError("Validation Error", "Mobile / Contact Number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await convertLeadToClientAction(lead.id, {
        companyName,
        contactPerson,
        phone,
        email,
        address: address.trim() || city || "Tamil Nadu",
        city: city.trim() || "Chennai",
        state,
        pincode,
        gstNumber,
        panNumber,
      });

      if (res.success) {
        success("Lead Converted", `${companyName} is now an active Client and visible in the Clients page.`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toastError("Conversion Failed", res.error || "Could not convert lead.");
      }
    } catch (err) {
      toastError("Error", err.message || "Failed to convert lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-sky-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#1B3260]">
                Convert Lead to Client
              </h3>
              <p className="text-xs text-slate-500">
                Entity ID: <span className="font-mono font-medium">{lead.entityId || "N/A"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConvert} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-800">
            <Check size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-xs">Manual Lead-to-Client Conversion</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Converting this lead will immediately promote it to an active client in the <strong>Clients</strong> portfolio.
                All existing follow-up history, notes, and salesperson assignments will be preserved.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Primary Contact Person *</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Mobile / Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Billing Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Registered Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street, Area"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-1 focus:ring-[#0481A2] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Confirm Conversion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
