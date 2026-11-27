import { DOCUMENT_COMPRESSION_CONFIG, formatBytes } from "./config";
import { DocumentItem } from "./compression-types";
import { PDFDocument } from "pdf-lib";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  isPdf: boolean;
  targetMaxBytes: number;
  pdfPageCount?: number;
  policyDescription: string;
}

/**
 * Validate a file and determine its compression targets.
 */
export async function validateAndInspectFile(file: File): Promise<ValidationResult> {
  const { uploadLimits, images, pdf } = DOCUMENT_COMPRESSION_CONFIG;

  // 1. Check maximum upload size limit
  if (file.size > uploadLimits.maxOriginalSizeBytes) {
    return {
      isValid: false,
      error: `File "${file.name}" (${formatBytes(file.size)}) exceeds the maximum allowed upload limit of ${formatBytes(uploadLimits.maxOriginalSizeBytes)}.`,
      isPdf: false,
      targetMaxBytes: 0,
      policyDescription: "Exceeds upload limit",
    };
  }

  // 2. Determine MIME type & extension
  const mimeType = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  const isImage =
    mimeType.startsWith("image/") ||
    images.allowedTypes.includes(mimeType as any) ||
    ["jpg", "jpeg", "png", "webp", "svg"].includes(ext);

  const isPdf =
    mimeType === "application/pdf" ||
    pdf.allowedTypes.includes(mimeType as any) ||
    ext === "pdf";

  if (!isImage && !isPdf) {
    return {
      isValid: false,
      error: `File format ".${ext}" is not supported. Please upload JPG, PNG, WEBP, or PDF documents.`,
      isPdf: false,
      targetMaxBytes: 0,
      policyDescription: "Unsupported format",
    };
  }

  // 3. Image policy
  if (isImage) {
    return {
      isValid: true,
      isPdf: false,
      targetMaxBytes: images.maxSizeBytes,
      policyDescription: `Target max ${formatBytes(images.maxSizeBytes)} while preserving text & stamp clarity`,
    };
  }

  // 4. PDF policy - inspect page count
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Load without parsing all objects if possible to check page count
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 1) {
      return {
        isValid: true,
        isPdf: true,
        pdfPageCount: 1,
        targetMaxBytes: pdf.singlePageMaxBytes,
        policyDescription: `Single-page PDF: Target max ${formatBytes(pdf.singlePageMaxBytes)}`,
      };
    } else {
      return {
        isValid: true,
        isPdf: true,
        pdfPageCount: pageCount,
        targetMaxBytes: pdf.multiPageMaxBytes,
        policyDescription: `Multi-page PDF (${pageCount} pages): Target max ${formatBytes(pdf.multiPageMaxBytes)}`,
      };
    }
  } catch (err: any) {
    // Check if password protected
    if (err?.message?.toLowerCase().includes("encrypt") || err?.name === "EncryptedPDFError") {
      return {
        isValid: false,
        error: `The PDF "${file.name}" is password-protected or encrypted. Please remove password protection before uploading.`,
        isPdf: true,
        targetMaxBytes: 0,
        policyDescription: "Encrypted PDF",
      };
    }

    // If PDF parsing encountered proprietary tags or non-standard header, still allow as valid PDF
    return {
      isValid: true,
      isPdf: true,
      targetMaxBytes: pdf.multiPageMaxBytes,
      policyDescription: `PDF Document: Target max ${formatBytes(pdf.multiPageMaxBytes)}`,
    };
  }
}

/**
 * Build initial DocumentItem state for a selected file.
 */
export async function createDocumentItem(file: File): Promise<DocumentItem> {
  const validation = await validateAndInspectFile(file);
  const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isImage = !validation.isPdf && file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

  if (!validation.isValid) {
    return {
      id,
      file,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      originalSize: file.size,
      compressedSize: file.size,
      targetMaxBytes: 0,
      compressedFile: null,
      status: "error",
      progress: 0,
      percentSaved: 0,
      isPdf: validation.isPdf,
      errorMessage: validation.error,
      policyDescription: validation.policyDescription,
      previewUrl,
    };
  }

  // If already under target size, it is ready/eligible for skipped compression
  const alreadyOptimized = file.size <= validation.targetMaxBytes;

  return {
    id,
    file,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    originalSize: file.size,
    compressedSize: file.size,
    targetMaxBytes: validation.targetMaxBytes,
    compressedFile: alreadyOptimized ? file : null,
    status: alreadyOptimized ? "skipped" : "ready",
    progress: alreadyOptimized ? 100 : 0,
    percentSaved: 0,
    isPdf: validation.isPdf,
    pdfPageCount: validation.pdfPageCount,
    policyDescription: validation.policyDescription,
    previewUrl,
  };
}
