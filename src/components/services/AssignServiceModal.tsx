"use client";

import { useActionState, useEffect, useState, useRef, useTransition, DragEvent, ChangeEvent } from "react";
import {
  Plus,
  X,
  Loader2,
  Layers,
  UploadCloud,
  FileText,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { assignClientServiceAction, fetchServicesCatalogAction } from "@/app/actions/services";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";
import { WORKFLOW_OPTIONS, getServiceFulfillmentPreset } from "@/lib/services/fulfillment-workflows";
import {
  BRAND360_CATEGORIES,
  detectServiceCategory,
  Brand360ServiceCategory,
} from "@/lib/services/service-catalogue-master";
import { ServiceCombobox, ServiceComboboxItem } from "@/components/services/ServiceCombobox";
import {
  calculateExpiryDate,
  calculateReminderDate,
  getMonthsForFrequency,
  RenewalFrequency,
} from "@/lib/renewals/renewal-dates";

interface AssignServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
}

interface SelectedDocFile {
  id: string;
  file: File;
  docType: string;
  previewUrl?: string;
}

export function AssignServiceModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
}: AssignServiceModalProps) {
  const [state, formAction, isServerPending] = useActionState(assignClientServiceAction, null);
  const [isPending, startTransition] = useTransition();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null);

  // Form field states for automatic category and fee population
  const [serviceName, setServiceName] = useState<string>("");
  const [serviceCategory, setServiceCategory] = useState<string>("Business Registration");
  const [isCategoryManuallyEdited, setIsCategoryManuallyEdited] = useState<boolean>(false);
  const [serviceFee, setServiceFee] = useState<number | string>(0);
  const [govtFee, setGovtFee] = useState<number | string>(0);
  const [taxRate, setTaxRate] = useState<number | string>(18);
  const [discountPreset, setDiscountPreset] = useState("0");
  const [customDiscountPct, setCustomDiscountPct] = useState("0");
  const [workflowPreset, setWorkflowPreset] = useState<string>("");

  // Document Uploads State
  const [attachedFiles, setAttachedFiles] = useState<SelectedDocFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  // Helper: calculate initial date that is guaranteed to be a working day (Mon-Fri)
  const getInitialWorkingDate = () => {
    const d = new Date();
    let added = 0;
    while (added < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        added++;
      }
    }
    const y = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, "0");
    const nd = String(d.getDate()).padStart(2, "0");
    return `${y}-${nm}-${nd}`;
  };

  const [expectedDate, setExpectedDate] = useState<string>(getInitialWorkingDate);
  const [weekendWarning, setWeekendWarning] = useState<string | null>(null);

  // Renewal Configuration State
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isRenewable, setIsRenewable] = useState<boolean>(false);
  const [renewalFrequency, setRenewalFrequency] = useState<RenewalFrequency>("Annually");
  const [renewalDurationMonths, setRenewalDurationMonths] = useState<number>(12);
  const [renewalAmount, setRenewalAmount] = useState<number | string>(0);
  const [renewalReminderDays, setRenewalReminderDays] = useState<number>(30);
  const [calculatedExpiryDate, setCalculatedExpiryDate] = useState<string>("");

  const handleExpectedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setExpectedDate("");
      setWeekendWarning(null);
      return;
    }
    const [y, m, d] = val.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const day = picked.getDay();
    if (day === 6) {
      picked.setDate(picked.getDate() + 2); // Saturday -> Monday
      const ny = picked.getFullYear();
      const nm = String(picked.getMonth() + 1).padStart(2, "0");
      const nd = String(picked.getDate()).padStart(2, "0");
      setExpectedDate(`${ny}-${nm}-${nd}`);
      setWeekendWarning("Saturday selected. Auto-snapped to Monday (working day).");
    } else if (day === 0) {
      picked.setDate(picked.getDate() + 1); // Sunday -> Monday
      const ny = picked.getFullYear();
      const nm = String(picked.getMonth() + 1).padStart(2, "0");
      const nd = String(picked.getDate()).padStart(2, "0");
      setExpectedDate(`${ny}-${nm}-${nd}`);
      setWeekendWarning("Sunday selected. Auto-snapped to Monday (working day).");
    } else {
      setExpectedDate(val);
      setWeekendWarning(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServicesCatalogAction().then((data) => setCatalog(data || []));
      fetchSalespeopleAction().then((data) => setSalespeople(data || []));
      setAttachedFiles([]);
      setExpectedDate(getInitialWorkingDate());
      setWeekendWarning(null);
      // Reset form states on open
      setSelectedCatalogItem(null);
      setServiceName("");
      setServiceCategory("Business Registration");
      setIsCategoryManuallyEdited(false);
      setServiceFee(0);
      setGovtFee(0);
      setTaxRate(18);
      setWorkflowPreset("");
    }
  }, [isOpen]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      attachedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [attachedFiles]);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success("Service Assigned", "Deliverable and verification documents saved successfully.");
      onSuccess();
      onClose();
    } else if (state.error) {
      toastError("Failed to assign service", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  // Update calculated expiry date whenever start date or duration changes
  useEffect(() => {
    if (isRenewable && startDate && renewalDurationMonths > 0) {
      const exp = calculateExpiryDate(startDate, renewalDurationMonths);
      setCalculatedExpiryDate(exp);
    }
  }, [isRenewable, startDate, renewalDurationMonths]);

  const handleSelectCatalogItem = (item: ServiceComboboxItem | null) => {
    setSelectedCatalogItem(item);
    if (item) {
      setServiceName(item.name);
      const cat = item.category || detectServiceCategory(item.name);
      setServiceCategory(cat);
      setIsCategoryManuallyEdited(false);
      const sFee = item.default_service_fee !== undefined ? item.default_service_fee : 0;
      setServiceFee(sFee);
      setGovtFee(item.default_govt_fee !== undefined ? item.default_govt_fee : 0);
      setWorkflowPreset(item.workflow_preset || "");

      // Renewal configuration detection & prepopulation
      const renewable = Boolean(item.is_renewable);
      setIsRenewable(renewable);
      if (renewable) {
        const freq = (item.renewal_frequency as RenewalFrequency) || "Annually";
        setRenewalFrequency(freq);
        const duration = item.renewal_duration_months || getMonthsForFrequency(freq);
        setRenewalDurationMonths(duration);
        setRenewalAmount(item.default_renewal_amount !== undefined ? item.default_renewal_amount : sFee);
        setRenewalReminderDays(item.default_reminder_days || 30);
        setCalculatedExpiryDate(calculateExpiryDate(startDate, duration));
      } else {
        setCalculatedExpiryDate("");
      }
    } else {
      setIsRenewable(false);
      setCalculatedExpiryDate("");
    }
  };

  const handleCustomTextChange = (text: string) => {
    setServiceName(text);
    if (!isCategoryManuallyEdited && text.trim().length > 0) {
      const detected = detectServiceCategory(text);
      setServiceCategory(detected);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setServiceCategory(cat);
    setIsCategoryManuallyEdited(true);
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: SelectedDocFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        toastError("File too large", `${file.name} exceeds 15MB limit.`);
        continue;
      }
      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      // Smart default document type based on file name
      const fn = file.name.toLowerCase();
      let docType = "PAN/GST";
      if (fn.includes("aadhaar") || fn.includes("id") || fn.includes("passport")) {
        docType = "Company Document";
      } else if (fn.includes("incorporation") || fn.includes("coi") || fn.includes("reg")) {
        docType = "Registration";
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        docType,
        previewUrl,
      });
    }

    setAttachedFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setAttachedFiles((prev) => {
      const item = prev.find((x) => x.id === idToRemove);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== idToRemove);
    });
  };

  const handleDocTypeChange = (id: string, newType: string) => {
    setAttachedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, docType: newType } : item))
    );
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFilesAdded(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Remove any raw files from file input to prevent duplicate submission
    formData.delete("required_documents");

    // Append our managed files and their specific types
    attachedFiles.forEach((item, idx) => {
      formData.append("required_documents", item.file);
      formData.append(`document_type_${idx}`, item.docType);
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isSubmitting = isPending || isServerPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold border border-sky-100">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assign Service Deliverable</h3>
              <p className="text-[11px] text-slate-500">{clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="pricing_mode" value="govt_fee_included" />

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          {/* Quick Select from Catalog with Searchable Combobox */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pick from Services Catalog</label>
            <ServiceCombobox
              catalog={catalog}
              selectedItem={selectedCatalogItem}
              onSelect={handleSelectCatalogItem}
              onCustomTextChange={handleCustomTextChange}
              placeholder="Type to search or enter custom service..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
              <input
                name="service_name"
                required
                type="text"
                value={serviceName}
                onChange={(e) => handleCustomTextChange(e.target.value)}
                placeholder="e.g. GST Registration"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Category</span>
                {!isCategoryManuallyEdited && serviceName && (
                  <span className="text-[10px] text-sky-600 font-medium">Auto-detected</span>
                )}
              </label>
              <select
                name="service_category"
                value={serviceCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                {BRAND360_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Professional / Service Fee (₹)</label>
              <input
                name="service_fee"
                type="number"
                step="any"
                value={serviceFee}
                onChange={(e) => setServiceFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Government Fee (₹)</label>
              <input
                name="govt_fee"
                type="number"
                step="any"
                value={govtFee}
                onChange={(e) => setGovtFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <input
                name="tax_rate"
                type="number"
                step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Discount (%) */}
          {(() => {
            const pkg = Math.max(0, Number(serviceFee) || 0);
            const govt = Math.max(0, Number(govtFee) || 0);
            const profFee = Math.max(0, pkg - govt);
            const discPct =
              discountPreset === "custom"
                ? Math.max(0, Math.min(100, Number(customDiscountPct) || 0))
                : Number(discountPreset) || 0;
            const discAmt = Math.round(profFee * (discPct / 100) * 100) / 100;
            const discountedProf = Math.max(0, Math.round((profFee - discAmt) * 100) / 100);
            const taxableAmt = Math.round((discountedProf + govt) * 100) / 100;
            const gstAmt = Math.round(taxableAmt * ((Number(taxRate) || 0) / 100) * 100) / 100;
            const finalTotal = Math.round((taxableAmt + gstAmt) * 100) / 100;

            return (
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <input type="hidden" name="discount_percentage" value={String(discPct)} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Discount (%)</label>
                    <select
                      value={discountPreset}
                      onChange={(e) => setDiscountPreset(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
                    >
                      <option value="0">0% (No Discount)</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="15">15%</option>
                      <option value="20">20%</option>
                      <option value="25">25%</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {discountPreset === "custom" && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Custom Discount (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={customDiscountPct}
                        onChange={(e) => setCustomDiscountPct(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                  <div>Prof. Fee: <strong className="text-slate-900">₹{profFee.toLocaleString("en-IN")}</strong></div>
                  {discPct > 0 && (
                    <div>Discount ({discPct}%): <strong className="text-emerald-700">-₹{discAmt.toLocaleString("en-IN")}</strong></div>
                  )}
                  <div>Taxable: <strong className="text-slate-900">₹{taxableAmt.toLocaleString("en-IN")}</strong></div>
                  <div>Final Total: <strong className="text-[#0481A2]">₹{finalTotal.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Executive</label>
              <select
                name="assigned_employee_id"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="">Unassigned</option>
                {salespeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
              <select
                name="service_status"
                defaultValue="Pending"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Pending">Pending (Not Started)</option>
                <option value="Processing">Processing / In Progress</option>
                <option value="Documents Pending">Documents Pending</option>
                <option value="Waiting for Approval">Waiting for Approval</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Fulfillment Workflow Template Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fulfillment Workflow Template</label>
            <select
              name="workflow_preset"
              value={workflowPreset}
              onChange={(e) => setWorkflowPreset(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-medium text-slate-800"
            >
              <option value="">Auto-Detect from Service Name &amp; Category</option>
              {WORKFLOW_OPTIONS.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Target Delivery Date</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Working Days Only</span>
              </label>
              <input
                name="expected_completion_date"
                type="date"
                value={expectedDate}
                onChange={handleExpectedDateChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs"
              />
              {weekendWarning ? (
                <p className="text-[10.5px] text-amber-600 font-medium mt-1 leading-tight">
                  ⚠️ {weekendWarning}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Committed service delivery timeline (Mon–Fri only).
                </p>
              )}
            </div>
          </div>

          {/* RENEWABLE SERVICE CONFIGURATION (Displays only if service is renewable) */}
          {isRenewable && (
            <div className="p-3.5 bg-gradient-to-br from-sky-50/70 to-indigo-50/40 border border-sky-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0481A2] text-white flex items-center justify-center shadow-2xs">
                    <RefreshCw size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      Renewal Configuration
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-100 text-[#0481A2] font-semibold border border-sky-200">
                        Renewable Service
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Auto-creates initial cycle and schedules recurring renewal timeline
                    </p>
                  </div>
                </div>
              </div>

              {/* Hidden input to pass is_renewable flag */}
              <input type="hidden" name="is_renewable" value="true" />

              <div className="pt-2 border-t border-sky-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Renewal Frequency</label>
                    <select
                      name="renewal_frequency"
                      value={renewalFrequency}
                      onChange={(e) => {
                        const freq = e.target.value as RenewalFrequency;
                        setRenewalFrequency(freq);
                        const dur = getMonthsForFrequency(freq);
                        setRenewalDurationMonths(dur);
                        if (startDate) setCalculatedExpiryDate(calculateExpiryDate(startDate, dur));
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-medium"
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
                      value={renewalDurationMonths}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setRenewalDurationMonths(val);
                        if (startDate) setCalculatedExpiryDate(calculateExpiryDate(startDate, val));
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Renewal Amount (₹)</label>
                    <input
                      name="renewal_amount"
                      type="number"
                      step="any"
                      value={renewalAmount}
                      onChange={(e) => setRenewalAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-number font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reminder Alert (Days Before)</label>
                    <input
                      name="renewal_reminder_days"
                      type="number"
                      min={0}
                      value={renewalReminderDays}
                      onChange={(e) => setRenewalReminderDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs"
                    />
                  </div>
                </div>

                {/* Expiry Date Review Box */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-[#0481A2]" />
                      First Expiry / Renewal Date Review
                    </span>
                    <span className="text-[10px] text-[#0481A2] font-semibold">Editable for Client Specifics</span>
                  </label>
                  <input
                    name="renewal_expiry_date"
                    type="date"
                    value={calculatedExpiryDate}
                    onChange={(e) => setCalculatedExpiryDate(e.target.value)}
                    required={isRenewable}
                    className="w-full px-3 py-1.5 border border-sky-300 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-semibold text-[#1B3260]"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Calculated from Start Date ({startDate || "today"}) + {renewalDurationMonths} months. Authorized users can review and adjust prior to saving.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* REQUIRED DOCUMENTS UPLOAD SECTION (PAN Card, Verification Proofs, etc.) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-bold text-slate-900 text-xs">
                  Required Documents / Verification Images
                </label>
                <p className="text-[11px] text-slate-500">
                  Attach PAN Card, Aadhaar, Company Proof, or onboarding documents (Images / PDF)
                </p>
              </div>
              {attachedFiles.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#0481A2]">
                  {attachedFiles.length} file{attachedFiles.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                isDragging
                  ? "border-[#0481A2] bg-sky-50"
                  : "border-slate-300 hover:border-[#0481A2] bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-8 h-8 rounded-full bg-sky-50 text-[#0481A2] flex items-center justify-center">
                <UploadCloud size={16} />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Click to attach PAN or required documents, or drag & drop
              </p>
              <p className="text-[10px] text-slate-400">
                PNG, JPG, WEBP, or PDF up to 15MB each
              </p>
            </div>

            {/* Selected files list */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2 pt-1 max-h-40 overflow-y-auto pr-1">
                {attachedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.previewUrl ? (
                        <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate max-w-[170px] text-[11px]">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={item.docType}
                        onChange={(e) => handleDocTypeChange(item.id, e.target.value)}
                        className="text-[10px] font-semibold py-1 px-1.5 border border-slate-200 rounded bg-slate-50 text-slate-700 focus:outline-none focus:border-[#0481A2]"
                      >
                        <option value="PAN/GST">PAN / GST Proof</option>
                        <option value="Company Document">ID / Aadhaar / Proof</option>
                        <option value="Registration">Registration Proof</option>
                        <option value="Agreement">Client Agreement</option>
                        <option value="Other">Other Document</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Special Client Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Expedited filing requested..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
            />
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
                  <span>Assigning & Uploading...</span>
                </>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
