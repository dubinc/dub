import { WorkspaceProps } from "@/lib/types";

export const refundSingularSaleEvent = async ({
  queryParams,
  workspace,
}: {
  queryParams: Record<string, string>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
}) => {
  // TODO:
  // Not implemented
};
