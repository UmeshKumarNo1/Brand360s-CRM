/**
 * BRAND 360s CRM - Global Document Compression Configuration
 * Centralized size thresholds, file policies, and readability constraints.
 */

export const DOCUMENT_COMPRESSION_CONFIG = {
  // Image compression parameters
  images: {
    maxSizeBytes: 200 * 1024, // 200 KB target maximum
    allowedTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ],
    // High-definition dimensions to ensure text, seals, signatures remain crisp
    maxWidthOrHeight: 2560,
    initialQuality: 0.92,
    minQuality: 0.82, // Never drop below 0.82 to preserve document readability and stamp clarity
    useWebWorker: true,
  },

  // PDF compression parameters
  pdf: {
    singlePageMaxBytes: 200 * 1024, // 200 KB target maximum for single-page
    multiPageMaxBytes: 1024 * 1024, // 1 MB target maximum for multi-page
    allowedTypes: ["application/pdf"],
  },

  // Global upload limits before processing (allow any PDF size up to 100 MB)
  uploadLimits: {
    maxOriginalSizeBytes: 100 * 1024 * 1024, // 100 MB generous limit
  },

  preserveReadability: true,
} as const;

export type AllowedMimeType =
  | (typeof DOCUMENT_COMPRESSION_CONFIG.images.allowedTypes)[number]
  | (typeof DOCUMENT_COMPRESSION_CONFIG.pdf.allowedTypes)[number];

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
