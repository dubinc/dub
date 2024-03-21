import {
  isBlacklistedDomain,
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  getLinksCountQuerySchema,
  getLinksQuerySchema,
} from "@/lib/zod/schemas/links";
import {
  DEFAULT_REDIRECTS,
  DUB_DOMAINS,
  SHORT_DOMAIN,
  getDomainWithoutWWW,
  getParamsFromURL,
  getUrlFromString,
  isDubDomain,
  linkConstructor,
  truncate,
  validKeyRegex,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { checkIfKeyExists, getRandomKey } from "../planetscale";
import { recordLink } from "../tinybird";
import {
  LinkProps,
  LinkWithTagIdsProps,
  RedisLinkProps,
  WorkspaceProps,
} from "../types";
import z from "../zod";

export async function getLinksForWorkspace({
  workspaceId,
  domain,
  tagId,
  tagIds,
  search,
  sort = "createdAt",
  page,
  userId,
  showArchived,
  withTags,
}: z.infer<typeof getLinksQuerySchema> & {
  workspaceId: string;
}) {
  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      archived: showArchived ? undefined : false,
      ...(domain && { domain }),
      ...(search && {
        OR: [
          {
            key: { contains: search },
          },
          {
            url: { contains: search },
          },
        ],
      }),
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(combinedTagIds.length > 0 && {
        tags: { some: { tagId: { in: combinedTagIds } } },
      }),
      ...(userId && { userId }),
    },
    include: {
      user: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
    ...(page && {
      skip: (page - 1) * 100,
    }),
  });

  return links.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });

    const tags = link.tags.map(({ tag }) => tag);

    return {
      ...link,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
      shortLink,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
      workspaceId: `ws_${link.projectId}`,
    };
  });
}

export async function getLinksCount({
  searchParams,
  workspaceId,
  userId,
}: {
  searchParams: z.infer<typeof getLinksCountQuerySchema>;
  workspaceId: string;
  userId?: string | null;
}) {
  const { groupBy, search, domain, tagId, tagIds, showArchived, withTags } =
    searchParams;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const linksWhere = {
    projectId: workspaceId,
    archived: showArchived ? undefined : false,
    ...(userId && { userId }),
    ...(search && {
      OR: [
        {
          key: { contains: search },
        },
        {
          url: { contains: search },
        },
      ],
    }),
    // when filtering by domain, only filter by domain if the filter group is not "Domains"
    ...(domain &&
      groupBy !== "domain" && {
        domain,
      }),
  };

  if (groupBy === "tagId") {
    return await prisma.linkTag.groupBy({
      by: ["tagId"],
      where: {
        link: linksWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          tagId: "desc",
        },
      },
    });
  } else {
    const where = {
      ...linksWhere,
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(combinedTagIds.length > 0 && {
        tags: {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        },
      }),
    };

    if (groupBy === "domain") {
      return await prisma.link.groupBy({
        by: [groupBy],
        where,
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
      });
    } else {
      return await prisma.link.count({
        where,
      });
    }
  }
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
  if (key.length === 0) {
    return null;
  }
  // replace all special characters
  key = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return key;
}

export async function processLink({
  payload,
  workspace,
  userId,
  bulk = false,
  skipKeyChecks = false, // only skip when key doesn't change (e.g. when editing a link)
}: {
  payload: LinkWithTagIdsProps;
  workspace?: WorkspaceProps;
  userId?: string;
  bulk?: boolean;
  skipKeyChecks?: boolean;
}) {
  let {
    domain,
    key,
    url,
    image,
    proxy,
    password,
    rewrite,
    expiresAt,
    ios,
    android,
    geo,
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
  const processedUrl = getUrlFromString(url);
  if (!processedUrl) {
    return {
      link: payload,
      error: "Invalid destination url.",
      code: "unprocessable_entity",
    };
  }

  // free plan restrictions
  if (!workspace || workspace.plan === "free") {
    if (proxy || password || rewrite || expiresAt || ios || android || geo) {
      return {
        link: payload,
        error:
          "You can only use custom social media cards, password-protection, link cloaking, link expiration, device and geo targeting on a Pro plan and above. Upgrade to Pro to use these features.",
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
    const keyBlacklisted = await isBlacklistedKey(key);
    if (keyBlacklisted) {
      return {
        link: payload,
        error: "Invalid key.",
        code: "unprocessable_entity",
      };
    }
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
    if (!allowedHostnames.includes(urlDomain)) {
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
    key = await getRandomKey(domain, payload["prefix"]);
  } else if (!skipKeyChecks) {
    const processedKey = processKey(key);
    if (!processedKey) {
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
  } else if (tagIds.length > 0) {
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
  }

  // custom social media image checks (see if R2 is configured)
  if (proxy && !process.env.STORAGE_SECRET_ACCESS_KEY) {
    return {
      link: payload,
      error: "Missing storage access key.",
      code: "bad_request",
    };
  }

  // expire date checks
  if (expiresAt) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      return {
        link: payload,
        error: "Invalid expiry date. Expiry date must be in ISO-8601 format.",
        code: "unprocessable_entity",
      };
    }
    // check if expiresAt is in the future
    if (new Date(expiresAt) < new Date()) {
      return {
        link: payload,
        error: "Expiry date must be in the future.",
        code: "unprocessable_entity",
      };
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
      url: processedUrl,
      // make sure projectId is set to the current workspace
      projectId: workspace?.id || null,
      // if userId is passed, set it (we don't change the userId if it's already set, e.g. when editing a link)
      ...(userId && {
        userId,
      }),
    },
    error: null,
  };
}

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

export async function addLink(link: LinkWithTagIdsProps) {
  let { key, url, expiresAt, title, description, image, proxy, geo } = link;

  const combinedTagIds = combineTagIds(link);

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  const { tagId, tagIds, ...rest } = link;

  const response = await prisma.link.create({
    data: {
      ...rest,
      key,
      title: truncate(title, 120),
      description: truncate(description, 240),
      // if it's an uploaded image, make this null first because we'll update it later
      image: proxy && image && !isStored(image) ? null : image,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || Prisma.JsonNull,
      ...(combinedTagIds.length > 0 && {
        tags: {
          createMany: {
            data: combinedTagIds.map((tagId) => ({ tagId })),
          },
        },
      }),
    },
    include: {
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  const uploadedImageUrl = `${process.env.STORAGE_BASE_URL}/images/${response.id}`;

  if (proxy && image && !isStored(image)) {
    await Promise.all([
      // upload image to R2
      storage.upload(`images/${response.id}`, image, {
        width: 1200,
        height: 630,
      }),
      // update the null image we set earlier to the uploaded image URL
      prisma.link.update({
        where: {
          id: response.id,
        },
        data: {
          image: uploadedImageUrl,
        },
      }),
    ]);
  }

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });
  const tags = response.tags.map(({ tag }) => tag);
  return {
    ...response,
    // optimistically set the image URL to the uploaded image URL
    image:
      proxy && image && !isStored(image) ? uploadedImageUrl : response.image,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    workspaceId: `ws_${response.projectId}`,
  };
}

export async function bulkCreateLinks({
  links,
}: {
  links: LinkWithTagIdsProps[];
}) {
  if (links.length === 0) return [];

  // create links via $transaction (because Prisma doesn't support nested createMany)
  // ref: https://github.com/prisma/prisma/issues/8131#issuecomment-997667070
  const createdLinks = await prisma.$transaction(
    links.map(({ tagId, tagIds, ...link }) => {
      const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
        getParamsFromURL(link.url);

      const combinedTagIds = combineTagIds({ tagId, tagIds });

      return prisma.link.create({
        data: {
          ...link,
          title: truncate(link.title, 120),
          description: truncate(link.description, 240),
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
          geo: link.geo || undefined,
          ...(combinedTagIds.length > 0 && {
            tags: {
              createMany: {
                data: combinedTagIds.map((tagId) => ({ tagId })),
              },
            },
          }),
        },
        include: {
          tags: {
            select: {
              tagId: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    }),
  );

  await propagateBulkLinkChanges(createdLinks);

  return createdLinks.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });
    const tags = link.tags.map(({ tag }) => tag);
    return {
      ...link,
      shortLink,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
      workspaceId: `ws_${link.projectId}`,
    };
  });
}

export async function propagateBulkLinkChanges(
  links: (LinkProps & { tags: { tagId: string }[] })[],
) {
  const pipeline = redis.pipeline();

  // split links into domains for better write effeciency in Redis
  const linksByDomain: Record<string, Record<string, RedisLinkProps>> = {};

  await Promise.all(
    links.map(async (link) => {
      const { domain, key } = link;

      if (!linksByDomain[domain]) {
        linksByDomain[domain] = {};
      }
      // this technically will be a synchronous function since isIframeable won't be run for bulk link creation
      const formattedLink = await formatRedisLink(link);
      linksByDomain[domain][key.toLowerCase()] = formattedLink;

      // record link in Tinybird
      await recordLink({ link });
    }),
  );

  Object.entries(linksByDomain).forEach(([domain, links]) => {
    pipeline.hset(domain, links);
  });

  await Promise.all([
    // update Redis
    pipeline.exec(),
    // update links usage for workspace
    prisma.project.update({
      where: {
        id: links[0].projectId!, // this will always be present
      },
      data: {
        linksUsage: {
          increment: links.length,
        },
      },
    }),
  ]);
}

export async function editLink({
  oldDomain = SHORT_DOMAIN,
  oldKey,
  oldImage,
  updatedLink,
}: {
  oldDomain?: string;
  oldKey: string;
  oldImage?: string;
  updatedLink: LinkWithTagIdsProps;
}) {
  let {
    id,
    domain,
    key,
    url,
    expiresAt,
    title,
    description,
    image,
    proxy,
    geo,
  } = updatedLink;
  const changedKey = key.toLowerCase() !== oldKey.toLowerCase();
  const changedDomain = domain !== oldDomain;

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  // exclude fields that should not be updated
  const {
    id: _,
    clicks,
    lastClicked,
    updatedAt,
    tagId,
    tagIds,
    ...rest
  } = updatedLink;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  if (proxy && image && !isStored(image)) {
    // only upload image if proxy is true and image is not stored in R2
    await storage.upload(`images/${id}`, image, {
      width: 1200,
      height: 630,
    });
  }

  const [response, ..._effects] = await Promise.all([
    prisma.link.update({
      where: {
        id,
      },
      data: {
        ...rest,
        key,
        title: truncate(title, 120),
        description: truncate(description, 240),
        image:
          proxy && image && !isStored(image)
            ? `${process.env.STORAGE_BASE_URL}/images/${id}`
            : image,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        geo: geo || Prisma.JsonNull,
        tags: {
          deleteMany: {
            tagId: {
              notIn: combinedTagIds,
            },
          },
          connectOrCreate: combinedTagIds.map((tagId) => ({
            where: { linkId_tagId: { linkId: id, tagId } },
            create: { tagId },
          })),
        },
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    }),
    // if key is changed: delete the old key in Redis
    (changedDomain || changedKey) &&
      redis.hdel(oldDomain, oldKey.toLowerCase()),
  ]);

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });

  const tags = response.tags.map(({ tag }) => tag);

  return {
    ...response,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    workspaceId: `ws_${response.projectId}`,
  };
}

export async function deleteLink(linkId: string) {
  const link = await prisma.link.delete({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });
  return await Promise.allSettled([
    // if the image is stored in Cloudflare R2, delete it
    link.proxy &&
      link.image?.startsWith(process.env.STORAGE_BASE_URL as string) &&
      storage.delete(`images/${link.id}`),
    redis.hdel(link.domain, link.key.toLowerCase()),
    recordLink({ link, deleted: true }),
    link.projectId &&
      prisma.project.update({
        where: {
          id: link.projectId,
        },
        data: {
          linksUsage: {
            decrement: 1,
          },
        },
      }),
  ]);
}

export async function archiveLink({
  linkId,
  archived,
}: {
  linkId: string;
  archived: boolean;
}) {
  return await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      archived,
    },
  });
}

export async function transferLink({
  linkId,
  newWorkspaceId,
}: {
  linkId: string;
  newWorkspaceId: string;
}) {
  return await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      projectId: newWorkspaceId,
      // remove tags when transferring link
      tags: {
        deleteMany: {},
      },
    },
  });
}
