"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULT_CRM_SETTINGS } from "@/lib/constants/crm-settings";

export interface SettingsActionState {
  error?: string | null;
  success?: boolean;
  settings?: any;
}

export async function fetchCrmSettingsAction() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("crm_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_CRM_SETTINGS;
    }

    return {
      ...DEFAULT_CRM_SETTINGS,
      ...data,
      default_gst_rate: Number(data.default_gst_rate) || 18,
    };
  } catch {
    return DEFAULT_CRM_SETTINGS;
  }
}

export async function updateCrmSettingsAction(
  prevState: SettingsActionState | null,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Unauthorized: Only system administrators can update enterprise billing settings." };
  }

  const company_name = (formData.get("company_name") as string)?.trim() || DEFAULT_CRM_SETTINGS.company_name;
  const company_address = (formData.get("company_address") as string)?.trim() || DEFAULT_CRM_SETTINGS.company_address;
  const gstin = (formData.get("gstin") as string)?.trim() || null;
  const pan = (formData.get("pan") as string)?.trim() || null;
  const cin = (formData.get("cin") as string)?.trim() || null;
  const invoice_prefix = (formData.get("invoice_prefix") as string)?.trim() || "B360-INV-";
  const default_gst_rate = parseFloat(formData.get("default_gst_rate") as string) || 18;
  const default_payment_terms = (formData.get("default_payment_terms") as string) || "Due on Receipt";
  const bank_name = (formData.get("bank_name") as string)?.trim() || null;
  const account_number = (formData.get("account_number") as string)?.trim() || null;
  const ifsc = (formData.get("ifsc") as string)?.trim() || null;
  const account_holder_name = (formData.get("account_holder_name") as string)?.trim() || null;
  const upi_id = (formData.get("upi_id") as string)?.trim() || null;
  const payment_instructions = (formData.get("payment_instructions") as string) || null;
  const terms_conditions = (formData.get("terms_conditions") as string) || null;
  const authorized_signatory = (formData.get("authorized_signatory") as string) || null;

  const { error } = await supabase
    .from("crm_settings")
    .upsert({
      id: "default",
      company_name,
      company_address,
      gstin,
      pan,
      cin,
      invoice_prefix,
      default_gst_rate,
      default_payment_terms,
      bank_name,
      account_number,
      ifsc,
      account_holder_name,
      upi_id,
      payment_instructions,
      terms_conditions,
      authorized_signatory,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/invoices");
  return { success: true };
}

