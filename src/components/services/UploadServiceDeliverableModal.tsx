"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Loader2,
  FileUp,
  Zap,
} from "lucide-react";
import { uploadClientServiceDocumentAction } from "@/app/actions/documents";
import { useToast } from "@/components/common/ToastProvider";
import {
  useDocumentCompression,
  DOCUMENT_COMPRESSION_CONFIG,
  formatBytes,
} from "@/lib/document-compression";
import { DocumentCompressionModal } from "@/components/common/DocumentCompressionModal";

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
  const { requestCompression, compressionModalProps } = useDocumentCompression();

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

  // Clean up object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [selectedFiles]);

  if (!isOpen) return null;

  const handleFilesAdded = async (files: File[] | FileList | null) => {
    if (!files) return;
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // Validate against maximum upload limit (100 MB)
    const maxSizeBytes = DOCUMENT_COMPRESSION_CONFIG.uploadLimits.maxOriginalSizeBytes;
    const validFiles: File[] = [];
    for (const file of fileList) {
      if (file.size > maxSizeBytes) {
        toastError("File too large", `${file.name} exceeds maximum limit of ${formatBytes(maxSizeBytes)}.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Request compression confirmation and processing
    const compressed = await requestCompression(validFiles);
    if (!compressed || compressed.length === 0) return;

    const newItems: { file: File; previewUrl?: string; id: string }[] = [];
    for (const file of compressed) {
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

  const handleDownloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesAdded(files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = "";
    handleFilesAdded(files);
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      toastError("No file selected", "Please choose a certificate image or PDF to upload.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let lastError = "";

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
        } else if (res.error) {
          lastError = res.error;
          console.error("Upload action error:", res.error);
        }
      } catch (err: any) {
        lastError = err?.message || "Upload network failure";
        console.error("Upload error for file:", item.file.name, err);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      success(
        "Deliverable Uploaded",
        `${successCount} certificate document${successCount > 1 ? "s" : ""} saved.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      toastError("Upload Failed", lastError || "Could not upload deliverable documents. Please try again.");
    }
  };

  const handleSkip = () => {
    info(
      "Deliverable Pending",
      "You can upload the certificate anytime by clicking the document button on the service row."
    );
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Simple & Clean Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <FileUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Completion Deliverable</h3>
              <p className="text-[11px] text-slate-500">
                Service: <strong className="text-slate-700">{serviceName}</strong>
                {clientName ? ` • ${clientName}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <p className="text-slate-500 text-[11px]">
            Upload the completion deliverable (e.g. GST Certificate, Incorporation Certificate, Trademark Certificate) for client records.
          </p>

          {/* Deliverable Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Certificate / Document Type *
            </label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#0481A2]"
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

          {/* Simple Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Select Certificate Image or PDF *
              </label>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]">
                <Zap size={10} className="text-emerald-600 fill-emerald-600" />
                <span>Auto-Compression Active</span>
              </span>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                isDragging
                  ? "border-[#0481A2] bg-sky-50"
                  : "border-slate-300 hover:border-[#0481A2] bg-slate-50/40"
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
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center">
                <UploadCloud size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-xs">
                  Drag & drop certificate images here, or{" "}
                  <span className="text-[#0481A2] underline font-bold">browse</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PNG, JPG, WEBP, or PDF • Automatic document compression active
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files List with Previews */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-[11px]">
                Selected Files ({selectedFiles.length})
              </label>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.previewUrl ? (
                        <div className="w-9 h-9 rounded border border-slate-200 overflow-hidden bg-white shrink-0">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-[#0481A2] flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(item.file.size)} • {deliverableType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(item.file)}
                        className="p-1.5 text-slate-500 hover:text-[#0481A2] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Download document"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isUploading}
            className="text-slate-500 hover:text-slate-700 text-xs font-semibold py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload Deliverable</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Global Document Compression Confirmation, Progress & Result Dialog */}
      <DocumentCompressionModal {...compressionModalProps} />
    </div>
  );
}
