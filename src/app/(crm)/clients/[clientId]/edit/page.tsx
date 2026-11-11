import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { fetchClientByIdAction } from "@/app/actions/client-edit";
import { EditClientForm } from "@/components/clients/EditClientForm";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const resolvedParams = await params;
  const profile = await getCurrentUserProfileAction();

  if (!profile) {
    redirect("/login");
  }

  const client = await fetchClientByIdAction(resolvedParams.clientId);

  if (!client) {
    notFound();
  }

  const isAdmin = profile.role === "admin";
  const isOwner = client.assigned_salesperson === profile.id || client.created_by === profile.id;

  // Authorization check: only admin or assigned owner can access edit page
  if (!isAdmin && !isOwner) {
    redirect(`/clients/${resolvedParams.clientId}`);
  }

  return <EditClientForm client={client} isAdmin={isAdmin} />;
}

