import {
  isBlacklistedDomain,
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  DEFAULT_REDIRECTS,
  DUB_DOMAINS,
  SHORT_DOMAIN,
  getDomainWithoutWWW,
  getParamsFromURL,
  getUrlFromString,
  isDubDomain,
  linkConstructor,
  nanoid,
  truncate,
  validKeyRegex,
} from "@dub/utils";
import cloudinary from "cloudinary";
import { Session } from "../auth";
import { getLinkViaEdge } from "../planetscale";
import { recordLink } from "../tinybird";
import {
  LinkProps,
  LinkWithTagIdsProps,
  ProjectProps,
  RedisLinkProps,
} from "../types";

export async function getLinksForProject({
  projectId,
  domain,
  tagId,
  search,
  sort = "createdAt",
  page,
  userId,
  showArchived,
  withTags,
}: {
  projectId: string;
  domain?: string;
  tagId?: string;
  search?: string;
  sort?: "createdAt" | "clicks" | "lastClicked"; // descending for all
  page?: string;
  userId?: string | null;
  showArchived?: boolean;
  withTags?: boolean;
}): Promise<LinkProps[]> {
  const tagIds = tagId ? tagId.split(",") : [];

  const links = await prisma.link.findMany({
    where: {
      projectId,
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
      ...(tagIds.length > 0 && {
        tags: { some: { tagId: { in: tagIds } } },
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
      skip: (parseInt(page) - 1) * 100,
    }),
  });

  return links.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });
    return {
      ...link,
      tags: link.tags.map(({ tag }) => tag),
      shortLink,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    };
  });
}

export async function getLinksCount({
  searchParams,
  projectId,
  userId,
}: {
  searchParams: Record<string, string>;
  projectId: string;
  userId?: string | null;
}) {
  let { groupBy, search, domain, tagId, showArchived, withTags } =
    searchParams as {
      groupBy?: "domain" | "tagId";
      search?: string;
      domain?: string;
      tagId?: string;
      showArchived?: boolean;
      withTags?: boolean;
    };

  const tagIds = tagId ? tagId.split(",") : [];

  const linksWhere = {
    projectId,
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
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        _count: {
          select: {
            linksNew: true,
          },
        },
      },
      where: {
        projectId,
        linksNew: {
          some: {
            link: linksWhere,
          },
        },
      },
    });

    return tags.map((tag) => ({
      tagId: tag.id,
      _count: tag._count.linksNew,
    }));
  } else {
    const where = {
      ...linksWhere,
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(tagIds.length > 0 && {
        tags: {
          some: {
            id: {
              in: tagIds,
            },
          },
        },
      }),
    };

    if (groupBy) {
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

export async function checkIfKeyExists(domain: string, key: string) {
  // reserved keys for default short domain
  if (domain === SHORT_DOMAIN) {
    if ((await isReservedKey(key)) || DEFAULT_REDIRECTS[key]) {
      return true;
    }
    // if it's a default Dub domain, check if the key is a reserved key
  } else if (isDubDomain(domain)) {
    if (await isReservedUsername(key)) {
      return true;
    }
  }
  const link = await getLinkViaEdge(domain, key);
  return !!link;
}

export async function getRandomKey(domain: string): Promise<string> {
  /* recursively get random key till it gets one that's available */
  const key = nanoid();
  const response = await checkIfKeyExists(domain, key);
  if (response) {
    // by the off chance that key already exists
    return getRandomKey(domain);
  } else {
    return key;
  }
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
  return key;
}

export async function processLink({
  payload,
  project,
  session,
  bulk = false,
}: {
  payload: LinkWithTagIdsProps;
  project?: ProjectProps;
  session?: Session;
  bulk?: boolean;
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

  // url checks
  if (!url) {
    return {
      link: payload,
      error: "Missing destination url.",
      status: 400,
    };
  }
  const processedUrl = getUrlFromString(url);
  if (!processedUrl) {
    return {
      link: payload,
      error: "Invalid destination url.",
      status: 422,
    };
  }

  // free plan restrictions
  if (!project || project.plan === "free") {
    if (proxy || password || rewrite || expiresAt || ios || android || geo) {
      return {
        link: payload,
        error:
          "You can only use custom social media cards, password-protection, link cloaking, link expiration, device and geo targeting on a Pro plan and above. Upgrade to Pro to use these features.",
        status: 403,
      };
    }
    // can't use `/` in key on free plan
    if (key?.includes("/")) {
      return {
        link: payload,
        error:
          "Key cannot contain '/'. You can only use this on a Pro plan and above. Upgrade to Pro to use this feature.",
        status: 422,
      };
    }
  }

  // if domain is not defined, set it to the project's primary domain
  if (!domain) {
    domain = project?.domains?.find((d) => d.primary)?.slug || SHORT_DOMAIN;
  }

  // checks for default short domain
  if (domain === SHORT_DOMAIN) {
    const keyBlacklisted = await isBlacklistedKey(key);
    if (keyBlacklisted) {
      return {
        link: payload,
        error: "Invalid key.",
        status: 422,
      };
    }
    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      return {
        link: payload,
        error: "Invalid url.",
        status: 422,
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
        status: 422,
      };
    }

    // else, check if the domain belongs to the project
  } else if (!project?.domains?.find((d) => d.slug === domain)) {
    return {
      link: payload,
      error: "Domain does not belong to project.",
      status: 403,
    };
  }

  if (!key) {
    key = await getRandomKey(domain);
  }

  if (bulk) {
    if (image) {
      return {
        link: payload,
        error: "You cannot set custom social cards with bulk link creation.",
        status: 422,
      };
    }
    if (rewrite) {
      return {
        link: payload,
        error: "You cannot use link cloaking with bulk link creation.",
        status: 422,
      };
    }
    const exists = await checkIfKeyExists(domain, key);
    if (exists) {
      return {
        link: payload,
        error: `Link already exists.`,
        status: 409,
      };
    }
  }

  // custom social media image checks
  const uploadedImage = image && image.startsWith("data:image") ? true : false;
  if (uploadedImage && !process.env.CLOUDINARY_URL) {
    return {
      link: payload,
      error: "Missing Cloudinary environment variable.",
      status: 400,
    };
  }

  // expire date checks
  if (expiresAt) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      return {
        link: payload,
        error: "Invalid expiry date. Expiry date must be in ISO-8601 format.",
        status: 422,
      };
    }
    // check if expiresAt is in the future
    if (new Date(expiresAt) < new Date()) {
      return {
        link: payload,
        error: "Expiry date must be in the future.",
        status: 422,
      };
    }
  }

  // remove polyfill attributes from payload
  delete payload["shortLink"];
  delete payload["qrCode"];

  return {
    link: {
      ...payload,
      domain,
      key,
      url: processedUrl,
      // make sure projectId is set to the current project
      projectId: project?.id || null,
      // if session is passed, set userId to the current user's id (we don't change the userId if it's already set, e.g. when editing a link)
      ...(session && {
        userId: session.user.id,
      }),
    },
    error: null,
    status: 200,
  };
}

export async function addLink(link: LinkWithTagIdsProps) {
  let { domain, key, url, expiresAt, title, description, image, proxy, geo } =
    link;
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  const combinedTagIds = combineTagIds(link);

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  if (proxy && image) {
    const { secure_url } = await cloudinary.v2.uploader.upload(image, {
      public_id: key,
      folder: domain,
      overwrite: true,
      invalidate: true,
    });
    image = secure_url;
  }

  const { tagId, tagIds, ...rest } = link;

  const response = await prisma.link.create({
    data: {
      ...rest,
      key,
      title: truncate(title, 120),
      description: truncate(description, 240),
      image: uploadedImage ? undefined : image,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || undefined,
      ...(combinedTagIds.length > 0 && {
        tags: {
          createMany: {
            data: combinedTagIds.map((tagId) => ({ tagId })),
          },
        },
      }),
    },
  });

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });
  return {
    ...response,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
  };
}

export async function bulkCreateLinks({
  links,
  skipPrismaCreate,
}: {
  links: LinkWithTagIdsProps[];
  skipPrismaCreate?: boolean;
}) {
  if (links.length === 0) return [];

  let createdLinks: LinkProps[] = [];

  if (skipPrismaCreate) {
    createdLinks = links;
  } else {
    await prisma.link.createMany({
      data: links.map(({ tagId, tagIds, ...link }) => {
        const combinedTagIds = combineTagIds({ tagId, tagIds });
        const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
          getParamsFromURL(link.url);
        return {
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
        };
      }),
      skipDuplicates: true,
    });

    createdLinks = (await Promise.all(
      links.map(async (link) => {
        const { key, domain } = link;
        return await prisma.link.findUnique({
          where: {
            domain_key: {
              domain,
              key,
            },
          },
        });
      }),
    )) as LinkProps[];
  }

  const pipeline = redis.pipeline();

  // split links into domains
  const linksByDomain: Record<string, Record<string, RedisLinkProps>> = {};

  await Promise.all(
    createdLinks.map(async (link) => {
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

  await pipeline.exec();

  return createdLinks.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });
    return {
      ...link,
      shortLink,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    };
  });
}

export async function editLink({
  domain: oldDomain = SHORT_DOMAIN,
  key: oldKey,
  updatedLink,
}: {
  domain?: string;
  key: string;
  updatedLink: LinkWithTagIdsProps;
}) {
  const {
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
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  if (changedDomain || changedKey) {
    const exists = await checkIfKeyExists(domain, key);
    if (exists) return null;
  }
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

  const [response, ...effects] = await Promise.all([
    prisma.link.update({
      where: {
        id,
      },
      data: {
        ...rest,
        key,
        title: truncate(title, 120),
        description: truncate(description, 240),
        image: uploadedImage ? undefined : image,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        geo: geo || undefined,
        tags: {
          deleteMany: {
            tagId: {
              notIn: tagIds,
            },
          },
          connectOrCreate: tagIds.map((tagId) => ({
            where: { linkId_tagId: { linkId: id, tagId } },
            create: { tagId },
          })),
        },
      },
    }),
    ...(process.env.CLOUDINARY_URL
      ? [
          // only upload image to cloudinary if proxy is true and there's an image
          proxy && image
            ? cloudinary.v2.uploader.upload(image, {
                public_id: key,
                folder: domain,
                overwrite: true,
                invalidate: true,
              })
            : cloudinary.v2.uploader.destroy(`${domain}/${key}`, {
                invalidate: true,
              }),
        ]
      : []),
    // if key is changed: rename resource in Cloudinary, delete the old key in Redis and change the clicks key name
    ...(changedDomain || changedKey
      ? [
          ...(process.env.CLOUDINARY_URL
            ? [
                cloudinary.v2.uploader
                  .destroy(`${oldDomain}/${oldKey}`, {
                    invalidate: true,
                  })
                  .catch(() => {}),
              ]
            : []),
          redis.hdel(oldDomain, oldKey.toLowerCase()),
        ]
      : []),
  ]);
  if (proxy && image) {
    const { secure_url } = effects[0];
    response.image = secure_url;
    await prisma.link.update({
      where: {
        id,
      },
      data: {
        image: secure_url,
      },
    });
  }

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });

  return {
    ...response,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
  };
}

export async function deleteLink(link: LinkProps) {
  return await Promise.all([
    prisma.link.delete({
      where: {
        id: link.id,
      },
    }),
    cloudinary.v2.uploader.destroy(`${link.domain}/${link.key}`, {
      invalidate: true,
    }),
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
  newProjectId,
}: {
  linkId: string;
  newProjectId: string;
}) {
  return await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      projectId: newProjectId,
      tagId: null, // remove tags when transferring link
    },
  });
}

function combineTagIds({
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
