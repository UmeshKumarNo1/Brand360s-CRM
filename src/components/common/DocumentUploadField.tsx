"use client";

import React, { useRef, useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, X, CheckCircle2, Zap } from "lucide-react";
import { useDocumentCompression } from "@/lib/document-compression";
import { DocumentCompressionModal } from "@/components/common/DocumentCompressionModal";
import { formatBytes } from "@/lib/document-compression/config";

export interface DocumentUploadFieldProps {
  label?: string;
  helperText?: string;
  multiple?: boolean;
  accept?: string;
  maxOriginalSizeMB?: number;
  onFilesSelected: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable Drag-and-Drop Document Upload Field with integrated
 * automatic compression confirmation, optimization, and size validation.
 */
export function DocumentUploadField({
  label = "Upload Document",
  helperText = "PNG, JPG, WEBP, or PDF (Target: ≤ 200 KB for images/single-page, ≤ 1 MB for multi-page)",
  multiple = false,
  accept = "image/png,image/jpeg,image/jpg,image/webp,application/pdf",
  maxOriginalSizeMB = 15,
  onFilesSelected,
  className = "",
  disabled = false,
}: DocumentUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { requestCompression, compressionModalProps } = useDocumentCompression();

  const handleProcessFiles = async (rawFiles: FileList | File[] | null) => {
    if (!rawFiles) return;
    const list: File[] = Array.from(rawFiles);
    if (list.length === 0) return;

    // Filter oversized files
    const validFiles: File[] = [];
    for (const file of list) {
      if (file.size > maxOriginalSizeMB * 1024 * 1024) {
        alert(`"${file.name}" exceeds the maximum upload limit of ${maxOriginalSizeMB} MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Trigger compression workflow modal
    const compressed = await requestCompression(validFiles);
    if (compressed && compressed.length > 0) {
      onFilesSelected(compressed);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
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
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          disabled
            ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
            : isDragging
            ? "border-[#0481A2] bg-sky-50/70"
            : "border-slate-300 hover:border-[#0481A2] bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="w-9 h-9 rounded-full bg-sky-50 text-[#0481A2] flex items-center justify-center">
          <UploadCloud size={18} />
        </div>

        <div>
          <p className="text-xs font-bold text-slate-800">
            Click to upload or drag & drop documents
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{helperText}</p>
        </div>
      </div>

      {/* Global Compression Confirmation, Progress & Result Modal */}
      <DocumentCompressionModal {...compressionModalProps} />
    </div>
  );
}
