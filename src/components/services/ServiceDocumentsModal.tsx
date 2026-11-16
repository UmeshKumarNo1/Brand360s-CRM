"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import {
  X,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  Plus,
  Loader2,
  FileCheck2,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import {
  fetchServiceDocumentsAction,
  uploadClientServiceDocumentAction,
  deleteClientDocumentAction,
  ServiceDocument,
} from "@/app/actions/documents";
import { useToast } from "@/components/common/ToastProvider";

interface ServiceDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent?: () => void;
  clientId: string;
  clientServiceId: string;
  serviceName: string;
  clientName?: string;
  serviceStatus?: string;
}

export function ServiceDocumentsModal({
  isOpen,
  onClose,
  onRefreshParent,
  clientId,
  clientServiceId,
  serviceName,
  clientName,
  serviceStatus,
}: ServiceDocumentsModalProps) {
  const [documents, setDocuments] = useState<ServiceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const [previewDoc, setPreviewDoc] = useState<ServiceDocument | null>(null);

  // Upload Form State
  const [uploadDocType, setUploadDocType] = useState<string>("Registration");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchServiceDocumentsAction(clientServiceId);
      setDocuments(data || []);
    } catch {
      toastError("Error", "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      setActiveTab("list");
      setSelectedFile(null);
      setFilePreview(null);
      setPreviewDoc(null);

      // Pre-select doc type based on service status or name
      if (serviceStatus === "Completed") {
        setUploadDocType("Registration");
      } else {
        setUploadDocType("PAN/GST");
      }
    }
  }, [isOpen, clientServiceId, serviceStatus]);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toastError("File too large", "Maximum file size is 15MB.");
      return;
    }
    setSelectedFile(file);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toastError("Validation Error", "Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("client_service_id", clientServiceId);
      formData.append("document_type", uploadDocType);
      formData.append("file", selectedFile);

      const res = await uploadClientServiceDocumentAction(formData);
      if (res.success) {
        success("Document Uploaded", `${selectedFile.name} successfully saved.`);
        setSelectedFile(null);
        setFilePreview(null);
        setActiveTab("list");
        await loadDocuments();
        if (onRefreshParent) onRefreshParent();
      } else {
        toastError("Upload Failed", res.error || "Could not save document.");
      }
    } catch {
      toastError("Upload Error", "Server connection error.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;

    setIsDeletingId(docId);
    try {
      const res = await deleteClientDocumentAction(docId, clientId);
      if (res.success) {
        success("Document Deleted", `${docName} removed.`);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (previewDoc?.id === docId) setPreviewDoc(null);
        if (onRefreshParent) onRefreshParent();
      } else {
        toastError("Delete Failed", res.error || "Could not delete document.");
      }
    } catch {
      toastError("Error", "Failed to delete document.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case "Registration":
        return {
          label: "Registration / Deliverable",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "PAN/GST":
        return {
          label: "PAN / GST Certificate",
          className: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "Company Document":
        return {
          label: "Company / ID Proof",
          className: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "Agreement":
        return {
          label: "Agreement / Contract",
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "Payment Proof":
        return {
          label: "Payment Proof",
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };
      default:
        return {
          label: type || "Other",
          className: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const isImageFile = (url: string, name: string) => {
    if (url.startsWith("data:image/")) return true;
    return /\.(png|jpe?g|webp|svg|gif)$/i.test(name) || /\.(png|jpe?g|webp|svg|gif)$/i.test(url);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{serviceName}</h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                      serviceStatus === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}
                  >
                    {serviceStatus || "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Documents & Deliverables {clientName ? `• ${clientName}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "list" ? "upload" : "list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "upload"
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-[#0481A2] text-white hover:bg-[#036c88] shadow-xs"
                }`}
              >
                {activeTab === "upload" ? (
                  <>
                    <Eye size={13} />
                    <span>View Documents ({documents.length})</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>+ Upload Document</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 text-xs">
            {activeTab === "upload" ? (
              /* Inline Upload Form */
              <form onSubmit={handleUpload} className="space-y-4">
                <p className="text-slate-500 text-[11px]">
                  Upload client compliance documents (such as PAN cards or ID proofs) or completion deliverables (e.g. GST Certificate).
                </p>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Document Category *</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:border-[#0481A2]"
                  >
                    <option value="Registration">
                      Deliverable / Registration Certificate (e.g. GST, COI, Trademark)
                    </option>
                    <option value="PAN/GST">PAN Card / GST Identification</option>
                    <option value="Company Document">Company Document / Aadhaar / ID Proof</option>
                    <option value="Agreement">Client Agreement / Engagement Letter</option>
                    <option value="Payment Proof">Payment Receipt / Challan Proof</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>

                {/* Dropzone */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Select Document or Image *
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? "border-[#0481A2] bg-sky-50/70"
                        : "border-slate-300 hover:border-[#0481A2] bg-slate-50/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-[#0481A2] flex items-center justify-center">
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">
                        Drag & drop file here, or{" "}
                        <span className="text-[#0481A2] underline font-bold">browse</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, WEBP, SVG or PDF (up to 15MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected File Preview */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      {filePreview ? (
                        <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                          <img
                            src={filePreview}
                            alt={selectedFile.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Documents List */
              <div>
                {isLoading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-[#0481A2]" />
                    <span>Loading service documents...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">No Documents Attached Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                        {serviceStatus === "Completed"
                          ? "Upload deliverable certificates (e.g. GST Registration Certificate) to complete the portfolio."
                          : "Upload client PAN, verification proofs, or required documents for this service."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>
                        {serviceStatus === "Completed"
                          ? "Upload Deliverable Certificate"
                          : "Upload Initial Documents"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="font-bold text-slate-700 text-xs">
                        All Attached Documents ({documents.length})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Click a file to preview or download
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {documents.map((doc) => {
                        const badge = getDocTypeBadge(doc.document_type);
                        const isImg = isImageFile(doc.file_url, doc.file_name);

                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Visual Preview / Icon */}
                              {isImg ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 group relative cursor-pointer"
                                  title="Click to preview image"
                                >
                                  <img
                                    src={doc.file_url}
                                    alt={doc.file_name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye size={14} />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                                  <FileText size={20} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 truncate max-w-[260px]">
                                    {doc.file_name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {formatFileSize(doc.file_size)} • Uploaded on{" "}
                                  {new Date(doc.created_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isImg && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-1.5 text-slate-500 hover:text-[#0481A2] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                  title="Preview Image"
                                >
                                  <Eye size={14} />
                                </button>
                              )}

                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.file_name}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Open or Download"
                              >
                                <Download size={14} />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id, doc.file_name)}
                                disabled={isDeletingId === doc.id}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Delete document"
                              >
                                {isDeletingId === doc.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {documents.length} document{documents.length === 1 ? "" : "s"} attached
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Lightbox */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-[#243E76] text-white">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon size={16} className="text-sky-300" />
                <span className="font-semibold text-xs truncate">{previewDoc.file_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewDoc.file_name}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  title="Download File"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-100 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={previewDoc.file_url}
                alt={previewDoc.file_name}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Category: {previewDoc.document_type}</span>
              <span>Size: {formatFileSize(previewDoc.file_size)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

