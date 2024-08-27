import {
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import { checkIfKeyExists } from "@/lib/planetscale";
import { WorkspaceProps } from "@/lib/types";
import {
  DEFAULT_REDIRECTS,
  isDubDomain,
  linkConstructor,
  punyEncode,
  validKeyRegex,
} from "@dub/utils";
import { Link, Tag } from "@prisma/client";
import { DubApiError } from "../errors";

export type LinkWithTags = Link & {
  tags: { tag: Pick<Tag, "id" | "name" | "color"> }[];
};

/**
 * Combines tagIds into a single string array or undefined from tagId and tagIds arguments
 */
export function combineTagIds({
  tagId,
  tagIds,
}: {
  tagId?: string | null;
  tagIds?: string[];
}): string[] | undefined {
  // Use tagIds if present, fall back to tagId
  if (tagIds && Array.isArray(tagIds)) {
    return tagIds;
  }
  return tagId === null ? [] : tagId !== undefined ? [tagId] : undefined;
}

export async function keyChecks({
  domain,
  key,
  workspace,
}: {
  domain: string;
  key: string;
  workspace?: Pick<WorkspaceProps, "plan">;
}): Promise<{ error: string | null; code?: DubApiError["code"] }> {
  if ((key.length === 0 || key === "_root") && workspace?.plan === "free") {
    return {
      error:
        "You can only set a redirect for your root domain on a Pro plan and above. Upgrade to Pro to unlock this feature.",
      code: "forbidden",
    };
  }

  const link = await checkIfKeyExists(domain, key);
  if (link) {
    return {
      error: "Duplicate key: This short link already exists.",
      code: "conflict",
    };
  }

  if (isDubDomain(domain) && process.env.NEXT_PUBLIC_IS_DUB) {
    if (domain === "dub.sh") {
      if (DEFAULT_REDIRECTS[key] || (await isReservedKey(key))) {
        return {
          error: "Duplicate key: This short link already exists.",
          code: "conflict",
        };
      }
      if (await isBlacklistedKey(key)) {
        return {
          error: "Invalid key.",
          code: "unprocessable_entity",
        };
      }
    }

    if (key.length <= 3 && (!workspace || workspace.plan === "free")) {
      return {
        error: `You can only use keys that are 3 characters or less on a Pro plan and above. Upgrade to Pro to register a ${key.length}-character key.`,
        code: "forbidden",
      };
    }
    if (
      domain === "dub.link" &&
      key.length <= 5 &&
      (!workspace || workspace.plan === "free" || workspace.plan === "pro")
    ) {
      return {
        error: `You can only use dub.link with keys that are 5 characters or less on a Business plan and above. Upgrade to Business to register a ${key.length}-character dub.link key.`,
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

export function processKey({ domain, key }: { domain: string; key: string }) {
  // Skip if root domain
  if (key === "_root") {
    return key;
  }

  if (!validKeyRegex.test(key)) {
    return null;
  }
  // if key starts with _, return null (reserved route for Dub internals)
  if (key.startsWith("_")) {
    return null;
  }

  // remove all leading and trailing slashes from key
  key = key.replace(/^\/+|\/+$/g, "");
  /* 
    for default dub domains, remove all special characters + unicode normalization 
      to remove accents / diacritical marks. this is to prevent phishing/typo squatting
    for custom domains this is fine, since only the workspace can set the key
  */
  if (isDubDomain(domain)) {
    key = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  // encode the key to ascii
  key = punyEncode(key);

  return key;
}

// Transform link with additional properties
export const transformLink = (link: LinkWithTags) => {
  const tags = (link.tags || []).map(({ tag }) => tag);

  const shortLink = linkConstructor({
    domain: link.domain,
    key: link.key,
  });

  const qrLink = linkConstructor({
    domain: link.domain,
    key: link.key,
    searchParams: {
      qr: "1",
    },
  });

  return {
    ...link,
    shortLink,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    qrCode: `https://api.dub.co/qr?url=${qrLink}`,
    workspaceId: link.projectId ? `ws_${link.projectId}` : null,
  };
};
