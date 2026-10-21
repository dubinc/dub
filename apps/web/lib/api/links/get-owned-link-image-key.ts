import { getOwnedAssetKey } from "@/lib/storage/asset-keys";

/**
 * Object key for a link preview image stored by us.
 * Returns null unless the URL is exactly `images/{linkId}` or
 * `images/{linkId}_{nonce}` on the asset host.
 */
export function getOwnedLinkImageKey(
  image: string | null | undefined,
  linkId: string,
): string | null {
  return getOwnedAssetKey({
    kind: "linkImage",
    ownerId: linkId,
    url: image,
  });
}
