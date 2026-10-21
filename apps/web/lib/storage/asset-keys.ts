import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { OG_AVATAR_URL, R2_URL, nanoid } from "@dub/utils";
import {
  isSafeStorageKey,
  urlPathHasRelativeSegments,
} from "./assert-safe-storage-key";

/**
 * One place that knows every public-bucket key format and who owns it.
 *
 * A key is only ever:
 * - minted by the server from a server-side owner id (`mint`), or
 * - rebuilt from a stored URL after proving it sits under that owner's
 *   prefix (`ownedKeyFromUrl`).
 *
 * Never slice a key out of a column: a tenant can write another tenant's
 * well-formed URL into a column they own, and a delete would destroy it.
 */

const NONCE = /^[A-Za-z0-9_-]{1,32}$/;

// `{slug}-{nanoid}` with an optional sanitized extension
const PROGRAM_RESOURCE_NAME = /^[A-Za-z0-9_-]{1,900}(\.[A-Za-z0-9_-]{1,50})?$/;

interface AssetKind {
  /** Builds a fresh, server-chosen key for this owner. */
  mint: (ownerId: string) => string;
  /** True when `key` is a key this owner's asset can have. */
  isOwnedKey: (key: string, ownerId: string) => boolean;
}

/** `{prefix}{separator}{nonce}`, plus the bare `{prefix}` when `allowBare`. */
function prefixedAsset({
  prefix,
  separator = "",
  allowBare = false,
}: {
  prefix: (ownerId: string) => string;
  separator?: string;
  allowBare?: boolean;
}): AssetKind {
  return {
    mint: (ownerId) => `${prefix(ownerId)}${separator}${nanoid(7)}`,
    isOwnedKey: (key, ownerId) => {
      if (!ownerId) return false;
      const base = prefix(ownerId);

      if (allowBare && key === base) return true;
      if (!key.startsWith(`${base}${separator}`)) return false;

      return NONCE.test(key.slice(base.length + separator.length));
    },
  };
}

export const assetKinds = {
  customerAvatar: prefixedAsset({
    prefix: (customerId) => `customers/${customerId}/avatar_`,
  }),
  partnerImage: prefixedAsset({
    prefix: (partnerId) => `partners/${partnerId}/image_`,
  }),
  // Legacy avatars are `avatars/{userId}` with no nonce
  userAvatar: prefixedAsset({
    prefix: (userId) => `avatars/${userId}`,
    separator: "_",
    allowBare: true,
  }),
  workspaceLogo: prefixedAsset({
    prefix: (workspaceId) =>
      `workspaces/${prefixWorkspaceId(workspaceId)}/logo_`,
  }),
  domainLogo: prefixedAsset({
    prefix: (domainId) => `domains/${domainId}/logo_`,
  }),
  programLogo: prefixedAsset({
    prefix: (programId) => `programs/${programId}/logo_`,
  }),
  programWordmark: prefixedAsset({
    prefix: (programId) => `programs/${programId}/wordmark_`,
  }),
  integrationLogo: prefixedAsset({
    prefix: (integrationId) => `integrations/${integrationId}_`,
  }),
  // Legacy screenshots are `integration-screenshots/{nonce}` with no owner,
  // so they can never be proven owned and are never deleted.
  integrationScreenshot: prefixedAsset({
    prefix: (workspaceId) =>
      `integration-screenshots/${prefixWorkspaceId(workspaceId)}/`,
  }),
  linkImage: prefixedAsset({
    prefix: (linkId) => `images/${linkId}`,
    separator: "_",
    allowBare: true,
  }),
  programResource: {
    mint: () => {
      throw new Error("Program resource keys are minted by their upload URL.");
    },
    isOwnedKey: (key: string, programId: string) => {
      if (!programId) return false;

      return ["logos", "files"].some((folder) => {
        const base = `programs/${programId}/${folder}/`;
        return (
          key.startsWith(base) &&
          PROGRAM_RESOURCE_NAME.test(key.slice(base.length))
        );
      });
    },
  } satisfies AssetKind,
} satisfies Record<string, AssetKind>;

export type AssetKindName = keyof typeof assetKinds;

/** Key of an R2 asset URL, without any ownership check. */
function storageKeyFromUrl(url: string): string | null {
  if (urlPathHasRelativeSegments(url)) return null;

  let objectUrl: URL;
  let assetUrl: URL;
  try {
    objectUrl = new URL(url);
    assetUrl = new URL(R2_URL);
  } catch {
    return null;
  }

  if (objectUrl.origin !== assetUrl.origin) return null;
  if (objectUrl.username || objectUrl.password) return null;

  const basePath = assetUrl.pathname.replace(/\/$/, "");
  if (!objectUrl.pathname.startsWith(`${basePath}/`)) return null;

  const key = objectUrl.pathname.slice(basePath.length + 1);
  return isSafeStorageKey(key) ? key : null;
}

/** Public URL for a key. */
export function storageUrl(key: string) {
  return `${R2_URL}/${key}`;
}

/** A fresh key and its URL for this owner's asset. */
export function mintAssetKey(kind: AssetKindName, ownerId: string) {
  const key = assetKinds[kind].mint(ownerId);
  return {
    key,
    url: storageUrl(key),
  };
}

/**
 * The object key behind `url`, but ONLY when it is this owner's asset of
 * this kind. Returns null for anything else: missing, malformed, another
 * host, or another owner's object. Callers skip the delete on null.
 */
export function getOwnedAssetKey({
  kind,
  ownerId,
  url,
}: {
  kind: AssetKindName;
  ownerId: string;
  url: string | null | undefined;
}): string | null {
  if (!url || !ownerId) return null;

  const key = storageKeyFromUrl(url);
  if (!key) return null;

  return assetKinds[kind].isOwnedKey(key, ownerId) ? key : null;
}

/**
 * Decides what to persist for an incoming image value.
 *
 * - `undefined` / `null`: passed through (no change / cleared).
 * - unchanged from `current`, already this owner's asset, or a generated
 *   OG avatar: kept as-is.
 * - anything else (an external URL, base64, or ANOTHER tenant's R2 URL):
 *   a new key is minted for this owner and returned as `uploadKey`, so the
 *   caller copies the image into storage it owns.
 */
export function resolveIncomingImage({
  kind,
  ownerId,
  value,
  current,
}: {
  kind: AssetKindName;
  ownerId: string;
  value: string | null | undefined;
  current?: string | null;
}): {
  url: string | null | undefined;
  uploadKey: string | null;
} {
  if (value === undefined || value === null) {
    return {
      url: value,
      uploadKey: null,
    };
  }

  // Unchanged: the client sent back the URL that's already saved
  // Generated placeholder avatar, not a file in our bucket
  // Already this owner's own file
  if (
    (current && value === current) ||
    value.startsWith(OG_AVATAR_URL) ||
    getOwnedAssetKey({
      kind,
      ownerId,
      url: value,
    })
  ) {
    return {
      url: value,
      uploadKey: null,
    };
  }

  // Anything else (external URL, base64, or another tenant's R2 URL): copy it
  // into a new key this owner owns
  const { key, url } = mintAssetKey(kind, ownerId);

  return {
    url,
    uploadKey: key,
  };
}
