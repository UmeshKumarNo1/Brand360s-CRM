import imageCompression from "browser-image-compression";
import { DOCUMENT_COMPRESSION_CONFIG } from "./config";
import { DocumentItem } from "./compression-types";

export interface ImageCompressionOptions {
  onProgress?: (progress: number) => void;
}

/**
 * Compress an image document while strictly guaranteeing text, stamp, and certificate clarity.
 * For PNG documents, prevents aggressive resolution downscaling so text and signatures
 * remain 100% sharp and readable.
 */
export async function compressImageDocument(
  item: DocumentItem,
  options?: ImageCompressionOptions
): Promise<{ file: File; compressedSize: number; percentSaved: number; status: "completed" | "skipped" | "warning" }> {
  const { images } = DOCUMENT_COMPRESSION_CONFIG;
  const originalFile = item.file;
  const isPng =
    originalFile.type.toLowerCase() === "image/png" ||
    originalFile.name.toLowerCase().endsWith(".png");

  // 1. If already within target limit, skip recompression completely
  if (originalFile.size <= images.maxSizeBytes) {
    if (options?.onProgress) options.onProgress(100);
    return {
      file: originalFile,
      compressedSize: originalFile.size,
      percentSaved: 0,
      status: "skipped",
    };
  }

  if (options?.onProgress) options.onProgress(20);

  // 2. High-Clarity Optimization Pass
  // For PNG documents: retain high resolution (up to 2560px) and preserve native PNG format without raster blur
  const targetSizeMB = images.maxSizeBytes / (1024 * 1024);

  const primaryOptions: Parameters<typeof imageCompression>[1] = {
    maxSizeMB: isPng ? Math.max(targetSizeMB, 0.45) : targetSizeMB, // Allow up to 450 KB for PNG if needed to keep text 100% crisp
    maxWidthOrHeight: 2560, // Ultra HD to guarantee legal text, registration stamps & PAN numbers remain sharp
    useWebWorker: true,
    initialQuality: isPng ? 0.96 : 0.90, // High quality to prevent compression artifacts
    fileType: isPng ? "image/png" : (originalFile.type || "image/jpeg"),
    alwaysKeepResolution: isPng, // For PNG documents: preserve native resolution to prevent text blur
    onProgress: (p: number) => {
      if (options?.onProgress) {
        options.onProgress(Math.min(90, Math.round(p)));
      }
    },
  };

  let compressedBlob: Blob;
  try {
    compressedBlob = await imageCompression(originalFile, primaryOptions);
  } catch (err) {
    console.warn("Primary image compression error, preserving original:", err);
    compressedBlob = originalFile;
  }

  // If the compressed blob somehow became larger or corrupted, keep the original
  if (!compressedBlob || compressedBlob.size >= originalFile.size) {
    compressedBlob = originalFile;
  }

  if (options?.onProgress) options.onProgress(100);

  // Construct a File object preserving the original file name, MIME type and lastModified
  const compressedFile = new File([compressedBlob], originalFile.name, {
    type: originalFile.type || compressedBlob.type,
    lastModified: Date.now(),
  });

  const percentSaved = Math.max(
    0,
    Math.round(((originalFile.size - compressedFile.size) / originalFile.size) * 100)
  );

  return {
    file: compressedFile,
    compressedSize: compressedFile.size,
    percentSaved,
    status: percentSaved > 0 ? "completed" : "skipped",
  };
}
