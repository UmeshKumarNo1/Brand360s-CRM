"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import {
  X,
  UploadCloud,
  FileCheck2,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { uploadClientServiceDocumentAction } from "@/app/actions/documents";
import { useToast } from "@/components/common/ToastProvider";

interface UploadServiceDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId: string;
  clientServiceId: string;
  serviceName: string;
  clientName?: string;
}

export function UploadServiceDeliverableModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientServiceId,
  serviceName,
  clientName,
}: UploadServiceDeliverableModalProps) {
  const [deliverableType, setDeliverableType] = useState<string>("GST Certificate");
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; previewUrl?: string; id: string }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError, info } = useToast();

  // Smartly suggest default deliverable type based on service name
  useEffect(() => {
    if (!isOpen) return;
    const nameLower = (serviceName || "").toLowerCase();
    if (nameLower.includes("gst")) {
      setDeliverableType("GST Certificate");
    } else if (nameLower.includes("trademark") || nameLower.includes("ip")) {
      setDeliverableType("Trademark Registration Certificate");
    } else if (
      nameLower.includes("llp") ||
      nameLower.includes("incorporation") ||
      nameLower.includes("company") ||
      nameLower.includes("pvt")
    ) {
      setDeliverableType("Certificate of Incorporation");
    } else if (nameLower.includes("pan")) {
      setDeliverableType("PAN Card / Tax Proof");
    } else {
      setDeliverableType("Registration Certificate");
    }
    setSelectedFiles([]);
  }, [isOpen, serviceName]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [selectedFiles]);

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: { file: File; previewUrl?: string; id: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        toastError("File too large", `${file.name} exceeds 15MB limit.`);
        continue;
      }
      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
      newItems.push({
        file,
        previewUrl,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((x) => x.id === idToRemove);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== idToRemove);
    });
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

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      toastError("No file selected", "Please choose an image or document to upload.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;

    for (const item of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append("client_id", clientId);
        formData.append("client_service_id", clientServiceId);
        formData.append("document_type", deliverableType);
        formData.append("file", item.file);

        const res = await uploadClientServiceDocumentAction(formData);
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
          console.error("Upload failed for file:", item.file.name, res.error);
        }
      } catch (err) {
        failedCount++;
        console.error("Upload error for file:", item.file.name, err);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      success(
        "Deliverable Uploaded",
        `${successCount} completion document${successCount > 1 ? "s" : ""} saved successfully.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      toastError("Upload Failed", "Could not upload deliverable documents. Please try again.");
    }
  };

  const handleSkip = () => {
    info(
      "Deliverable Pending",
      "You can upload completion certificates anytime by clicking the document button on the service row."
    );
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Celebration Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-[#0481A2] to-[#243E76] px-6 py-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <CheckCircle2 size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                <Sparkles size={12} />
                <span>Service Completed!</span>
              </div>
              <h3 className="text-base font-bold text-white leading-tight">
                Upload Completion Deliverable
              </h3>
            </div>
          </div>
          <p className="text-xs text-white/80 mt-2 truncate">
            {serviceName} {clientName ? `• ${clientName}` : ""}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Attach the final deliverable certificate or filing proof (e.g. GST Certificate,
            Incorporation Certificate, Trademark Certificate) so the client and team have permanent
            access.
          </p>

          {/* Deliverable Type */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Certificate / Document Type *
            </label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]/30 shadow-2xs"
            >
              <option value="GST Certificate">GST Registration Certificate</option>
              <option value="Certificate of Incorporation">Certificate of Incorporation (COI)</option>
              <option value="Trademark Registration Certificate">Trademark Registration Certificate</option>
              <option value="PAN Card / Tax Proof">PAN / Tax Registration Document</option>
              <option value="Registration Certificate">General Registration Certificate</option>
              <option value="Final Client Agreement">Signed Agreement / Delivery Sign-off</option>
              <option value="Filing Proof">Government Filing Challan / Receipt</option>
              <option value="Other Deliverable">Other Completion Deliverable</option>
            </select>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Select Certificate Image or PDF *
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? "border-[#0481A2] bg-sky-50/70 scale-[0.99]"
                  : "border-slate-300 hover:border-[#0481A2] hover:bg-slate-50/80 bg-slate-50/40"
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
              <div className="w-10 h-10 rounded-full bg-sky-100 text-[#0481A2] flex items-center justify-center">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-xs">
                  Drag & drop certificate images here, or{" "}
                  <span className="text-[#0481A2] underline font-bold">browse</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports PNG, JPG, WEBP, SVG or PDF (up to 15MB each)
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files List with Previews */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 text-[11px]">
                Ready to Upload ({selectedFiles.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.previewUrl ? (
                        <div className="w-10 h-10 rounded-md border border-slate-200 overflow-hidden bg-white shrink-0 relative">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate max-w-[240px]">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(item.file.size)} • {deliverableType}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isUploading}
            className="text-slate-500 hover:text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading Certificate...</span>
                </>
              ) : (
                <>
                  <FileCheck2 size={14} />
                  <span>Upload & Save Certificate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

