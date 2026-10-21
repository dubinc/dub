import { getOwnedAssetKey } from "@/lib/storage/asset-keys";

export function getWorkspaceLogoStorageKey({
  workspaceId,
  logoUrl,
}: {
  workspaceId: string;
  logoUrl: string | null | undefined;
}) {
  return getOwnedAssetKey({
    kind: "workspaceLogo",
    ownerId: workspaceId,
    url: logoUrl,
  });
}
