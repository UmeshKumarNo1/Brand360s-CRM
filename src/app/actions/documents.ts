"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export type DocumentType =
  | "Company Document"
  | "Registration"
  | "PAN/GST"
  | "Payment Proof"
  | "Agreement"
  | "Invoice"
  | "Other";

export interface ServiceDocument {
  id: string;
  client_id: string;
  client_service_id?: string | null;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface DocumentActionResult {
  success?: boolean;
  error?: string | null;
  document?: ServiceDocument;
}

/**
 * Get authenticated Supabase client and user session.
 */
async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Helper to get a resilient storage client with service role fallback.
 */
function getStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Upload a document linked to a client and/or client_service.
 * Supports image files (.png, .jpg, .webp, .svg) and PDFs.
 */
export async function uploadClientServiceDocumentAction(
  formData: FormData
): Promise<DocumentActionResult> {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user) {
      return { error: "Authentication required to upload documents." };
    }

    const clientId = formData.get("client_id") as string;
    const clientServiceId = (formData.get("client_service_id") as string) || null;
    const rawDocType = (formData.get("document_type") as string) || "Other";
    const file = formData.get("file") as File;

    if (!clientId) {
      return { error: "Client ID is required." };
    }

    if (!file || file.size === 0) {
      return { error: "Please select a valid document or image file." };
    }

    // Limit to 100MB for large documents & multi-page PDFs
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { error: "File exceeds maximum size of 100MB." };
    }

    // Map UI doc type to database allowed CHECK constraint:
    // CHECK (document_type IN ('Company Document', 'Registration', 'PAN/GST', 'Payment Proof', 'Agreement', 'Invoice', 'Other'))
    let documentType: DocumentType = "Other";
    const normalized = rawDocType.toLowerCase();
    if (normalized.includes("pan") || normalized.includes("gst")) {
      documentType = "PAN/GST";
    } else if (
      normalized.includes("registration") ||
      normalized.includes("certificate") ||
      normalized.includes("coi") ||
      normalized.includes("deliverable")
    ) {
      documentType = "Registration";
    } else if (
      normalized.includes("company") ||
      normalized.includes("aadhaar") ||
      normalized.includes("id")
    ) {
      documentType = "Company Document";
    } else if (normalized.includes("agreement")) {
      documentType = "Agreement";
    } else if (normalized.includes("payment")) {
      documentType = "Payment Proof";
    } else if (normalized.includes("invoice")) {
      documentType = "Invoice";
    } else {
      documentType = "Other";
    }

    // Prepare buffer and path
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `client-docs/${clientId}/${clientServiceId || "general"}/${Date.now()}_${sanitizedName}`;

    let fileUrl: string | null = null;

    // 1. Try uploading to Supabase Storage bucket 'documents'
    try {
      const storageAdmin = getStorageAdmin() || supabase;
      const { data: uploadData, error: uploadErr } = await storageAdmin.storage
        .from("documents")
        .upload(storagePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = storageAdmin.storage
          .from("documents")
          .getPublicUrl(uploadData.path);
        fileUrl = publicUrlData.publicUrl;
      } else if (uploadErr) {
        console.warn("Supabase Storage bucket upload warning:", uploadErr.message);
      }
    } catch (storageErr) {
      console.warn("Storage upload exception:", storageErr);
    }

    // 2. If storage bucket was unavailable or returned no URL, use safe base64 Data URL fallback
    if (!fileUrl) {
      const base64 = fileBuffer.toString("base64");
      const mime = file.type || "application/octet-stream";
      fileUrl = `data:${mime};base64,${base64}`;
    }

    // 3. Insert record into public.documents
    const insertPayload = {
      client_id: clientId,
      client_service_id: clientServiceId,
      document_type: documentType,
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      uploaded_by: user.id,
    };

    // Use admin client if RLS restricts employee inserts, or standard client
    const dbClient = getStorageAdmin() || supabase;
    const { data: insertedDoc, error: insertError } = await dbClient
      .from("documents")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("Database document record insert error:", insertError);
      return { error: `Failed to record document: ${insertError.message}` };
    }

    // Revalidate paths
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    revalidatePath("/services");

    return {
      success: true,
      document: insertedDoc as ServiceDocument,
    };
  } catch (err: any) {
    console.error("Unexpected error in uploadClientServiceDocumentAction:", err);
    return { error: err?.message || "An unexpected error occurred while uploading the document." };
  }
}

/**
 * Fetch all documents associated with a specific client_service.
 */
export async function fetchServiceDocumentsAction(
  clientServiceId: string
): Promise<ServiceDocument[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("client_service_id", clientServiceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching service documents:", error);
      // Fallback via admin client if RLS blocked read
      const admin = getStorageAdmin();
      if (admin) {
        const { data: adminData } = await admin
          .from("documents")
          .select("*")
          .eq("client_service_id", clientServiceId)
          .order("created_at", { ascending: false });
        return (adminData as ServiceDocument[]) || [];
      }
      return [];
    }

    return (data as ServiceDocument[]) || [];
  } catch (err) {
    console.error("Exception in fetchServiceDocumentsAction:", err);
    return [];
  }
}

/**
 * Delete a document by its ID.
 */
export async function deleteClientDocumentAction(
  documentId: string,
  clientId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const admin = getStorageAdmin() || supabase;

    // Fetch document to get file_url for optional storage cleanup
    const { data: doc } = await admin
      .from("documents")
      .select("file_url")
      .eq("id", documentId)
      .single();

    const { error: deleteError } = await admin
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Try cleanup from storage if it's a Supabase storage URL
    if (doc?.file_url && doc.file_url.includes("/storage/v1/object/public/documents/")) {
      try {
        const path = doc.file_url.split("/storage/v1/object/public/documents/")[1];
        if (path) {
          await admin.storage.from("documents").remove([path]);
        }
      } catch (cleanupErr) {
        console.warn("Storage delete warning:", cleanupErr);
      }
    }

    if (clientId) {
      revalidatePath(`/clients/${clientId}`);
    }
    revalidatePath("/clients");
    revalidatePath("/services");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete document." };
  }
}

