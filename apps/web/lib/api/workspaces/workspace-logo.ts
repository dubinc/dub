import { R2_URL } from "@dub/utils";
import { prefixWorkspaceId } from "./workspace-id";

export function getWorkspaceLogoKeyPrefix(workspaceId: string) {
  return `workspaces/${prefixWorkspaceId(workspaceId)}/logo_`;
}

export function getWorkspaceLogoStorageKey({
  workspaceId,
  logoUrl,
}: {
  workspaceId: string;
  logoUrl: string | null | undefined;
}) {
  if (!logoUrl) {
    return null;
  }

  const keyPrefix = getWorkspaceLogoKeyPrefix(workspaceId);

  if (!logoUrl.startsWith(`${R2_URL}/${keyPrefix}`)) {
    return null;
  }

  return logoUrl.replace(`${R2_URL}/`, "");
}
