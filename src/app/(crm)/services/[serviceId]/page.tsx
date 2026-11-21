import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const resolvedParams = await params;
  const serviceId = resolvedParams.serviceId;
  const supabase = await createClient();
  const profile = await getCurrentUserProfileAction();

  if (!profile) {
    redirect("/login");
  }

  // Fetch client_service to resolve client_id
  const { data: serviceRecord, error: svcErr } = await supabase
    .from("client_services")
    .select("id, client_id")
    .eq("id", serviceId)
    .single();

  if (svcErr || !serviceRecord?.client_id) {
    notFound();
  }

  // Service details are displayed directly in the client page services tab
  redirect(`/clients/${serviceRecord.client_id}?tab=services`);
}
