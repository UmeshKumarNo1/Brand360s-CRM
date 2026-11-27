import { DocumentItem, CompressionSummary } from "./compression-types";
import { compressImageDocument } from "./image-compressor";
import { compressPdfDocument } from "./pdf-compressor";

export interface ProgressCallback {
  (itemId: string, progress: number, status: DocumentItem["status"]): void;
}

/**
 * Compress an individual DocumentItem based on its type.
 */
export async function compressDocumentItem(
  item: DocumentItem,
  onProgress?: (progress: number) => void
): Promise<DocumentItem> {
  // If already errored or skipped
  if (item.status === "error") {
    return item;
  }

  // If already below target size, mark skipped (already optimized)
  if (item.originalSize <= item.targetMaxBytes) {
    return {
      ...item,
      status: "skipped",
      progress: 100,
      compressedSize: item.originalSize,
      compressedFile: item.file,
      percentSaved: 0,
    };
  }

  try {
    if (item.isPdf) {
      const result = await compressPdfDocument(item, {
        onProgress,
      });

      return {
        ...item,
        status: result.status,
        progress: 100,
        compressedFile: result.file,
        compressedSize: result.compressedSize,
        percentSaved: result.percentSaved,
        requiresOverride: result.requiresOverride,
        errorMessage: result.warningMessage,
        achievableSizeBytes: result.achievableSizeBytes,
        achievableSizeFormatted: result.achievableSizeFormatted,
      };
    } else {
      const result = await compressImageDocument(item, {
        onProgress,
      });

      return {
        ...item,
        status: result.status,
        progress: 100,
        compressedFile: result.file,
        compressedSize: result.compressedSize,
        percentSaved: result.percentSaved,
      };
    }
  } catch (err: any) {
    return {
      ...item,
      status: "error",
      progress: 0,
      errorMessage: err?.message || "Failed to compress document.",
    };
  }
}

/**
 * Calculate summary metrics across an array of DocumentItems.
 */
export function calculateCompressionSummary(items: DocumentItem[]): CompressionSummary {
  const totalCount = items.length;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let hasErrors = false;
  let hasWarnings = false;
  let allCompleted = true;

  for (const item of items) {
    totalOriginalSize += item.originalSize;
    totalCompressedSize += item.compressedFile ? item.compressedSize : item.originalSize;
    if (item.status === "error") hasErrors = true;
    if (item.status === "warning") hasWarnings = true;
    if (item.status === "ready" || item.status === "compressing" || item.status === "evaluating") {
      allCompleted = false;
    }
  }

  const totalSavedBytes = Math.max(0, totalOriginalSize - totalCompressedSize);
  const overallPercentSaved =
    totalOriginalSize > 0
      ? Math.round((totalSavedBytes / totalOriginalSize) * 100)
      : 0;

  return {
    totalCount,
    totalOriginalSize,
    totalCompressedSize,
    totalSavedBytes,
    overallPercentSaved,
    hasErrors,
    hasWarnings,
    allCompleted,
  };
}
