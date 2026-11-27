/**
 * BRAND 360s CRM - Document Compression Data Types
 */

export type CompressionStatus =
  | "idle"
  | "ready"
  | "evaluating"
  | "compressing"
  | "completed"
  | "skipped"
  | "warning"
  | "error";

export interface DocumentItem {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  targetMaxBytes: number;
  compressedFile: File | null;
  status: CompressionStatus;
  progress: number; // 0 - 100
  percentSaved: number;
  isPdf: boolean;
  pdfPageCount?: number;
  errorMessage?: string;
  requiresOverride?: boolean;
  overrideGranted?: boolean;
  overrideReason?: string;
  policyDescription: string;
  previewUrl?: string;
  achievableSizeBytes?: number;
  achievableSizeFormatted?: string;
  userAcceptedAchievable?: boolean;
}

export interface CompressionSummary {
  totalCount: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSavedBytes: number;
  overallPercentSaved: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  allCompleted: boolean;
}

export interface DocumentCompressionResult {
  cancelled: boolean;
  files: File[];
  items: DocumentItem[];
  summary: CompressionSummary;
}
