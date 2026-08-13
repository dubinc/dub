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
  // Verified apps can be installed on any workspace.
  if (integration.verified) {
    return true;
  }

  // The app creator can install on any workspace they belong to (e.g. for testing).
  if (integration.userId && integration.userId === userId) {
    return true;
  }

  // Otherwise only the workspace that owns the app can install it.
  return (
    normalizeWorkspaceId(workspace.id) ===
    normalizeWorkspaceId(integration.projectId)
  );
};
