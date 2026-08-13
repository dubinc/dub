import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { WorkspaceProps } from "@/lib/types";
import { Integration } from "@prisma/client";

export const UNVERIFIED_APP_INSTALL_MESSAGE =
  "Dub hasn't verified this app. It can only be installed by its developer or on the developer's workspace.";

export const canInstallOAuthApp = ({
  integration,
  workspace,
  userId,
}: {
  integration: Pick<Integration, "verified" | "projectId" | "userId">;
  workspace: Pick<WorkspaceProps, "id">;
  userId: string;
}): boolean => {
  if (integration.verified) {
    return true;
  }

  if (integration.userId && integration.userId === userId) {
    return true;
  }

  return (
    normalizeWorkspaceId(workspace.id) ===
    normalizeWorkspaceId(integration.projectId)
  );
};
