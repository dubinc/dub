import {
  isSafeStorageKey,
  urlPathHasRelativeSegments,
} from "@/lib/storage/assert-safe-storage-key";
import { R2_URL } from "@dub/utils";

const LINK_IMAGE_NONCE = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Object key for a link preview image stored by us.
 * Returns null unless the URL is exactly `images/{linkId}` or
 * `images/{linkId}_{nonce}` on the asset host. The key is rebuilt from the
 * link id — it is never sliced out of the client-supplied URL.
 */
export function getOwnedLinkImageKey(
  image: string | null | undefined,
  linkId: string,
): string | null {
  if (!image || !linkId) return null;
  if (urlPathHasRelativeSegments(image)) return null;
  if (!isSafeStorageKey(`images/${linkId}`)) return null;

  let imageUrl: URL;
  let assetUrl: URL;
  try {
    imageUrl = new URL(image);
    assetUrl = new URL(R2_URL);
  } catch {
    return null;
  }

  if (imageUrl.origin !== assetUrl.origin) return null;
  if (imageUrl.username || imageUrl.password) return null;

  const basePath = assetUrl.pathname.replace(/\/$/, "");
  const prefix = `${basePath}/images/${linkId}`;
  const { pathname } = imageUrl;

  let key: string | null = null;

  if (pathname === prefix) {
    key = `images/${linkId}`;
  } else if (pathname.startsWith(`${prefix}_`)) {
    const nonce = pathname.slice(prefix.length + 1);
    if (LINK_IMAGE_NONCE.test(nonce)) {
      key = `images/${linkId}_${nonce}`;
    }
  }

  if (!key || !isSafeStorageKey(key)) return null;
  return key;
}
