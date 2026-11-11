"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface VendorActionState {
  error?: string | null;
  success?: boolean;
  vendor?: any;
}

export async function fetchVendorsAction() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("vendors")
      .select(`
        *,
        assignments:service_vendors (
          id,
          agreed_cost,
          payment_status,
          client_service:client_services!client_service_id (
            id,
            service_name,
            service_status
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vendors:", error);
      return { data: [], error: error.message };
    }

    const mapped = (data || []).map((v: any) => {
      // Active jobs = assignments where client_service is not Completed or Cancelled
      const activeAssignments = (v.assignments || []).filter((a: any) => {
        const sStatus = a.client_service?.service_status;
        return sStatus && sStatus !== "Completed" && sStatus !== "Cancelled";
      });

      return {
        id: v.id,
        name: v.name,
        company: v.company || v.name,
        contactPerson: v.contact_person || "-",
        phone: v.phone || "-",
        email: v.email || "-",
        category: v.category || "General",
        servicesProvided: v.services_provided || "-",
        status: v.status || "Active",
        notes: v.notes,
        assignmentsCount: activeAssignments.length,
        totalAssignmentsCount: (v.assignments || []).length,
        createdAt: v.created_at ? new Date(v.created_at).toLocaleDateString("en-IN") : "-",
      };
    });

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Failed to query vendors." };
  }
}

export async function createVendorAction(
  prevState: VendorActionState | null,
  formData: FormData
): Promise<VendorActionState> {
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contact_person") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const category = (formData.get("category") as string) || "General";
  const servicesProvided = (formData.get("services_provided") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const status = (formData.get("status") as string) || "Active";

  if (!name) {
    return { error: "Vendor name is required." };
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name,
      contact_person: contactPerson,
      email,
      phone,
      category,
      services_provided: servicesProvided,
      status,
      notes,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendors");
  return { success: true, vendor: data };
}

export async function updateVendorAction(
  prevState: VendorActionState | null,
  formData: FormData
): Promise<VendorActionState> {
  const supabase = await createClient();

  const vendorId = formData.get("vendor_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contact_person") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const category = (formData.get("category") as string) || "General";
  const servicesProvided = (formData.get("services_provided") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const status = (formData.get("status") as string) || "Active";

  if (!vendorId || !name) {
    return { error: "Vendor ID and name are required." };
  }

  const { data, error } = await supabase
    .from("vendors")
    .update({
      name,
      contact_person: contactPerson,
      email,
      phone,
      category,
      services_provided: servicesProvided,
      status,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendors");
  return { success: true, vendor: data };
}

export async function deleteVendorAction(vendorId: string): Promise<VendorActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", vendorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendors");
  return { success: true };
}

export async function toggleVendorStatusAction(vendorId: string, currentStatus: string): Promise<VendorActionState> {
  const supabase = await createClient();

  const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

  const { error } = await supabase
    .from("vendors")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", vendorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/vendors");
  return { success: true };
}
