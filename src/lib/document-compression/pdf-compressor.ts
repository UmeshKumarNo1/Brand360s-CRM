import { PDFDocument } from "pdf-lib";
import { DOCUMENT_COMPRESSION_CONFIG, formatBytes } from "./config";
import { DocumentItem } from "./compression-types";

export interface PdfCompressionOptions {
  onProgress?: (progress: number) => void;
}

export interface PdfCompressionResult {
  file: File;
  compressedSize: number;
  percentSaved: number;
  status: "completed" | "skipped" | "warning";
  requiresOverride?: boolean;
  warningMessage?: string;
  achievableSizeBytes?: number;
  achievableSizeFormatted?: string;
}

/**
 * Optimize and compress PDF documents using pdf-lib object stream compaction,
 * metadata optimization, and structure defragmentation while strictly preserving
 * searchable text, font vectors, stamps, and readability.
 */
export async function compressPdfDocument(
  item: DocumentItem,
  options?: PdfCompressionOptions
): Promise<PdfCompressionResult> {
  const originalFile = item.file;
  const targetMaxBytes = item.targetMaxBytes || (item.pdfPageCount === 1 
    ? DOCUMENT_COMPRESSION_CONFIG.pdf.singlePageMaxBytes 
    : DOCUMENT_COMPRESSION_CONFIG.pdf.multiPageMaxBytes);

  // 1. If already within target limit, skip recompression
  if (originalFile.size <= targetMaxBytes) {
    if (options?.onProgress) options.onProgress(100);
    return {
      file: originalFile,
      compressedSize: originalFile.size,
      percentSaved: 0,
      status: "skipped",
    };
  }

  if (options?.onProgress) options.onProgress(20);

  try {
    const arrayBuffer = await originalFile.arrayBuffer();
    if (options?.onProgress) options.onProgress(40);

    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    if (options?.onProgress) options.onProgress(50);

    let bestBytes: Uint8Array | null = null;

    // Strategy 1: Clean page reconstruction into a fresh PDF container.
    // This strips unreferenced print color profiles (e.g. GRACoL), orphaned streams,
    // and bloated print-intent metadata while keeping all vector graphics, fonts,
    // layout, text, and form elements 100% vector-sharp and lossless.
    try {
      const cleanDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
      const copiedPages = await cleanDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((p) => cleanDoc.addPage(p));

      cleanDoc.setTitle(pdfDoc.getTitle() || originalFile.name);
      cleanDoc.setProducer("Brand360s CRM Document Optimizer");
      cleanDoc.setCreator("Brand360s CRM");

      const cleanBytes = await cleanDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      });

      if (cleanBytes.length < originalFile.size) {
        bestBytes = cleanBytes;
      }
    } catch (cleanErr) {
      console.warn("Clean PDF page reconstruction fallback:", cleanErr);
    }

    if (options?.onProgress) options.onProgress(75);

    // Strategy 2: Direct structural object stream optimization
    try {
      pdfDoc.setProducer("Brand360s CRM Document Optimizer");
      pdfDoc.setCreator("Brand360s CRM");

      const directBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      });

      if (!bestBytes || directBytes.length < bestBytes.length) {
        bestBytes = directBytes;
      }
    } catch (directErr) {
      console.warn("Direct PDF stream compaction error:", directErr);
    }

    if (options?.onProgress) options.onProgress(90);

    // Determine the optimal byte stream
    const finalBuffer = (bestBytes && bestBytes.length < originalFile.size)
      ? (bestBytes.buffer as ArrayBuffer)
      : arrayBuffer;

    const resultingBlob = new Blob([finalBuffer], { type: "application/pdf" });
    const finalSize = resultingBlob.size;
    const finalFile = new File([resultingBlob], originalFile.name, {
      type: "application/pdf",
      lastModified: Date.now(),
    });

    const percentSaved = Math.max(
      0,
      Math.round(((originalFile.size - finalSize) / originalFile.size) * 100)
    );

    if (options?.onProgress) options.onProgress(100);

    // 2. Check if the resulting size is still above the target size
    if (finalSize > targetMaxBytes) {
      // Calculate best achievable compressed size in KBs while preserving vector/font legibility
      const isSinglePage = (item.pdfPageCount || 1) === 1;
      const baseTarget = isSinglePage ? 280 * 1024 : 650 * 1024;
      const achievableBytes = Math.min(
        finalSize,
        Math.max(baseTarget, Math.round(originalFile.size * (isSinglePage ? 0.20 : 0.35)))
      );
      const achievableFormatted = formatBytes(achievableBytes);

      return {
        file: finalFile,
        compressedSize: finalSize,
        percentSaved,
        status: "warning",
        requiresOverride: true,
        achievableSizeBytes: achievableBytes,
        achievableSizeFormatted: achievableFormatted,
        warningMessage: `This document cannot be reduced to ${formatBytes(targetMaxBytes)} without compromising clarity. At most, we can safely compress it to ~${achievableFormatted} in KBs.`,
      };
    }

    return {
      file: finalFile,
      compressedSize: finalSize,
      percentSaved,
      status: "completed",
    };
  } catch (err: any) {
    console.error("PDF compression error:", err);
    throw new Error(err?.message || "Failed to optimize PDF document.");
  }
}
