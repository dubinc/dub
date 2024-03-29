import { isReservedKey, isReservedUsername } from "@/lib/edge-config";
import { checkIfKeyExists } from "@/lib/planetscale";
import { SimpleLinkProps, WorkspaceProps } from "@/lib/types";
import {
  DEFAULT_REDIRECTS,
  GOOGLE_FAVICON_URL,
  SHORT_DOMAIN,
  getApexDomain,
  isDubDomain,
  log,
  validKeyRegex,
} from "@dub/utils";

export function combineTagIds({
  tagId,
  tagIds,
}: {
  tagId?: string | null;
  tagIds?: string[];
}): string[] {
  // Use tagIds if present, fall back to tagId
  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    return tagIds;
  }
  return tagId ? [tagId] : [];
}

export async function keyChecks({
  domain,
  key,
  workspace,
}: {
  domain: string;
  key: string;
  workspace?: WorkspaceProps;
}) {
  if (key.length === 0) {
    if (workspace?.plan === "free") {
      return {
        error:
          "You can only set a redirect for your root domain on a Pro plan and above. Upgrade to Pro to unlock this feature.",
        code: "forbidden",
      };
    } else {
      return {
        error:
          "To set a redirect for your root domain, navigate to your Domains tab and click 'Edit' on the domain you want to update.",
        code: "unprocessable_entity",
      };
    }
  }

  const link = await checkIfKeyExists(domain, key);
  if (link) {
    return {
      error: "Duplicate key: This short link already exists.",
      code: "conflict",
    };
  }

  if (isDubDomain(domain) && process.env.NEXT_PUBLIC_IS_DUB) {
    if (
      domain === SHORT_DOMAIN &&
      (DEFAULT_REDIRECTS[key] || (await isReservedKey(key)))
    ) {
      return {
        error: "Duplicate key: This short link already exists.",
        code: "conflict",
      };
    }

    if (key.length <= 3 && (!workspace || workspace.plan === "free")) {
      return {
        error: `You can only use keys that are 3 characters or less on a Pro plan and above. Upgrade to Pro to register a ${key.length}-character key.`,
        code: "forbidden",
      };
    }
    if (
      (await isReservedUsername(key)) &&
      (!workspace || workspace.plan === "free")
    ) {
      return {
        error:
          "This is a premium key. You can only use this key on a Pro plan and above. Upgrade to Pro to register this key.",
        code: "forbidden",
      };
    }
  }
  return {
    error: null,
  };
}

export function processKey(key: string) {
  if (!validKeyRegex.test(key)) {
    return null;
  }
  // remove all leading and trailing slashes from key
  key = key.replace(/^\/+|\/+$/g, "");
  // replace all special characters
  key = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return key;
}

export async function dubLinkChecks(link: SimpleLinkProps) {
  const invalidFavicon = await fetch(
    `${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`,
  ).then((res) => !res.ok);

  if (invalidFavicon) {
    return await log({
      message: `Suspicious link detected: ${link.domain}/${link.key} → ${link.url}`,
      type: "links",
      mention: true,
    });
  }
  return null;
}
