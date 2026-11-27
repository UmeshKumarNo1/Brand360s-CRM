"use client";

import { useState, useCallback, useRef } from "react";
import { DocumentCompressionModalProps } from "@/components/common/DocumentCompressionModal";

export function useDocumentCompression() {
  const [isOpen, setIsOpen] = useState(false);
  const [filesToProcess, setFilesToProcess] = useState<File[] | null>(null);

  // Store promise resolver for async workflow
  const resolveRef = useRef<((files: File[] | null) => void) | null>(null);

  /**
   * Request compression for a file or array of files.
   * Opens the confirmation dialog and returns a Promise that resolves
   * with the optimized File[] (or null if the user cancels).
   */
  const requestCompression = useCallback(
    (inputFiles: File | File[] | FileList | null): Promise<File[] | null> => {
      if (!inputFiles) {
        return Promise.resolve(null);
      }

      const filesArray: File[] =
        inputFiles instanceof File
          ? [inputFiles]
          : Array.from(inputFiles);

      if (filesArray.length === 0) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setFilesToProcess(filesArray);
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = useCallback((compressedFiles: File[]) => {
    setIsOpen(false);
    setFilesToProcess(null);
    if (resolveRef.current) {
      resolveRef.current(compressedFiles);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setFilesToProcess(null);
    if (resolveRef.current) {
      resolveRef.current(null);
      resolveRef.current = null;
    }
  }, []);

  const compressionModalProps: DocumentCompressionModalProps = {
    isOpen,
    files: filesToProcess,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    requestCompression,
    compressionModalProps,
    isModalOpen: isOpen,
  };
}
