import { isBlacklistedDomain } from "@/lib/edge-config";
import { getRandomKey } from "@/lib/planetscale";
import prisma from "@/lib/prisma";
import { NewLinkProps, ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import {
  DUB_DOMAINS,
  SHORT_DOMAIN,
  getDomainWithoutWWW,
  getUrlFromString,
  isDubDomain,
  isValidUrl,
  parseDateTime,
} from "@dub/utils";
import { combineTagIds, keyChecks, processKey } from "./utils";

export async function processLink<T extends Record<string, any>>({
  payload,
  workspace,
  userId,
  bulk = false,
  skipKeyChecks = false, // only skip when key doesn't change (e.g. when editing a link)
}: {
  payload: NewLinkProps & T;
  workspace?: WorkspaceProps;
  userId?: string;
  bulk?: boolean;
  skipKeyChecks?: boolean;
}): Promise<
  | {
      link: NewLinkProps & T;
      error: string;
      code?: string;
      status?: number;
    }
  | {
      link: ProcessedLinkProps & T;
      error: null;
      code?: never;
      status?: never;
    }
> {
  let {
    domain,
    key,
    url,
    image,
    proxy,
    password,
    rewrite,
    expiresAt: expiresAtRaw,
    expiredUrl,
    ios,
    android,
    geo,
    tagNames,
    createdAt,
  } = payload;

  const tagIds = combineTagIds(payload);

  // url checks
  if (!url) {
    return {
      link: payload,
      error: "Missing destination url.",
      code: "bad_request",
    };
  }
  url = getUrlFromString(url);
  if (!isValidUrl(url)) {
    return {
      link: payload,
      error: "Invalid destination url.",
      code: "unprocessable_entity",
    };
  }

  // free plan restrictions (after Jan 19, 2024)
  if (
    (!workspace || workspace.plan === "free") &&
    (!createdAt || new Date(createdAt) > new Date("2024-01-19"))
  ) {
    if (proxy || password || rewrite || expiresAtRaw || ios || android || geo) {
      const proFeaturesString = [
        proxy && "custom social media cards",
        password && "password protection",
        rewrite && "link cloaking",
        expiresAtRaw && "link expiration",
        ios && "iOS targeting",
        android && "Android targeting",
        geo && "geo targeting",
      ]
        .filter(Boolean)
        .join(", ")
        // final one should be "and" instead of comma
        .replace(/, ([^,]*)$/, " and $1");

      return {
        link: payload,
        error: `You can only use ${proFeaturesString} on a Pro plan and above. Upgrade to Pro to use these features.`,
        code: "forbidden",
      };
    }
  }

  // if domain is not defined, set it to the workspace's primary domain
  if (!domain) {
    domain = workspace?.domains?.find((d) => d.primary)?.slug || SHORT_DOMAIN;
  }

  // checks for default short domain
  if (domain === SHORT_DOMAIN) {
    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      return {
        link: payload,
        error: "Invalid url.",
        code: "unprocessable_entity",
      };
    }

    // checks for other Dub-owned domains (chatg.pt, spti.fi, etc.)
  } else if (isDubDomain(domain)) {
    // coerce type with ! cause we already checked if it exists
    const { allowedHostnames } = DUB_DOMAINS.find((d) => d.slug === domain)!;
    const urlDomain = getDomainWithoutWWW(url) || "";
    if (allowedHostnames && !allowedHostnames.includes(urlDomain)) {
      return {
        link: payload,
        error: `Invalid url. You can only use ${domain} short links for URLs starting with ${allowedHostnames
          .map((d) => `\`${d}\``)
          .join(", ")}.`,
        code: "unprocessable_entity",
      };
    }

    // else, check if the domain belongs to the workspace
  } else if (!workspace?.domains?.find((d) => d.slug === domain)) {
    return {
      link: payload,
      error: "Domain does not belong to workspace.",
      code: "forbidden",
    };
  }

  if (!key) {
    key = await getRandomKey({
      domain,
      prefix: payload["prefix"],
      long: domain === "loooooooo.ng",
    });
  } else if (!skipKeyChecks) {
    const processedKey = processKey(key);
    if (processedKey === null) {
      return {
        link: payload,
        error: "Invalid key.",
        code: "unprocessable_entity",
      };
    }
    key = processedKey;

    const response = await keyChecks({ domain, key, workspace });
    if (response.error) {
      return {
        link: payload,
        ...response,
      };
    }
  }

  if (bulk) {
    if (image) {
      return {
        link: payload,
        error: "You cannot set custom social cards with bulk link creation.",
        code: "unprocessable_entity",
      };
    }
    if (rewrite) {
      return {
        link: payload,
        error: "You cannot use link cloaking with bulk link creation.",
        code: "unprocessable_entity",
      };
    }

    // only perform tag validity checks if:
    // - not bulk creation (we do that check separately in the route itself)
    // - tagIds are present
  } else if (tagIds && tagIds.length > 0) {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
      },
      where: { projectId: workspace?.id, id: { in: tagIds } },
    });

    if (tags.length !== tagIds.length) {
      return {
        link: payload,
        error:
          "Invalid tagIds detected: " +
          tagIds
            .filter(
              (tagId) => tags.find(({ id }) => tagId === id) === undefined,
            )
            .join(", "),
        code: "unprocessable_entity",
      };
    }
  } else if (tagNames && tagNames.length > 0) {
    const tags = await prisma.tag.findMany({
      select: {
        name: true,
      },
      where: {
        projectId: workspace?.id,
        name: { in: tagNames },
      },
    });

    if (tags.length !== tagNames.length) {
      return {
        link: payload,
        error:
          "Invalid tagNames detected: " +
          tagNames
            .filter(
              (tagName) =>
                tags.find(({ name }) => tagName === name) === undefined,
            )
            .join(", "),
        status: 422,
      };
    }
  }

  // custom social media image checks (see if R2 is configured)
  if (proxy && !process.env.STORAGE_SECRET_ACCESS_KEY) {
    return {
      link: payload,
      error: "Missing storage access key.",
      code: "bad_request",
    };
  }

  let expiresAt: Date | null = null;

  // expire date checks
  if (expiresAtRaw) {
    const datetime = parseDateTime(expiresAtRaw);
    if (!datetime) {
      return {
        link: payload,
        error: "Invalid expiration date.",
        code: "unprocessable_entity",
      };
    }
    expiresAt = datetime;
    if (expiredUrl) {
      expiredUrl = getUrlFromString(expiredUrl);
      if (!isValidUrl(expiredUrl)) {
        return {
          link: payload,
          error: "Invalid expired URL.",
          code: "unprocessable_entity",
        };
      }
    }
  }

  // remove polyfill attributes from payload
  delete payload["shortLink"];
  delete payload["qrCode"];
  delete payload["prefix"];

  return {
    link: {
      ...payload,
      domain,
      key,
      // we're redefining these fields because they're processed in the function
      url,
      expiresAt,
      expiredUrl,
      // make sure projectId is set to the current workspace
      projectId: workspace?.id || null,
      // if userId is passed, set it (we don't change the userId if it's already set, e.g. when editing a link)
      userId: userId || payload.userId || null,
    },
    error: null,
  };
}
