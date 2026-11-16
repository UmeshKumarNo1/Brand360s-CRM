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
} from "lucide-react";
import { assignClientServiceAction, fetchServicesCatalogAction } from "@/app/actions/services";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

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

  // Document Uploads State
  const [attachedFiles, setAttachedFiles] = useState<SelectedDocFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchServicesCatalogAction().then((data) => setCatalog(data || []));
      fetchSalespeopleAction().then((data) => setSalespeople(data || []));
      setAttachedFiles([]);
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

  const handleCatalogChange = (serviceName: string) => {
    const item = catalog.find((c) => c.name === serviceName);
    setSelectedCatalogItem(item || null);
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

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          {/* Quick Select from Catalog */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pick from Services Catalog</label>
            <select
              onChange={(e) => handleCatalogChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
            >
              <option value="">Select a catalog template or enter custom...</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
              <input
                name="service_name"
                required
                type="text"
                defaultValue={selectedCatalogItem?.name || ""}
                placeholder="e.g. GST Registration"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                name="service_category"
                value={selectedCatalogItem?.category || "General"}
                onChange={(e) =>
                  setSelectedCatalogItem({
                    ...selectedCatalogItem,
                    category: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Company Incorporation">Company Incorporation</option>
                <option value="GST & Tax Filing">GST & Tax Filing</option>
                <option value="Intellectual Property">Intellectual Property</option>
                <option value="Accounting & Audit">Accounting & Audit</option>
                <option value="Web & Technology">Web & Technology</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Professional / Service Fee (₹)</label>
              <input
                name="service_fee"
                type="number"
                step="any"
                defaultValue={selectedCatalogItem?.default_service_fee || 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Government Fee (₹)</label>
              <input
                name="govt_fee"
                type="number"
                step="any"
                defaultValue={selectedCatalogItem?.default_govt_fee || 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                name="start_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Completion</label>
              <input
                name="expected_completion_date"
                type="date"
                defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

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
