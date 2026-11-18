import { reconcileAllClientsContractValuesAction } from "@/app/actions/client-reconciliation";

export async function POST() {
  const result = await reconcileAllClientsContractValuesAction();
  return Response.json(result);
}
