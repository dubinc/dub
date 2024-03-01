import {
  isBlacklistedDomain,
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import prisma from "@/lib/prisma";
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
  nanoid,
  truncate,
  validKeyRegex,
} from "@dub/utils";
import cloudinary from "cloudinary";
import { getLinkViaEdge } from "../planetscale";
import { recordLink } from "../tinybird";
import z from "../zod";
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
}: Omit<z.infer<typeof getLinksQuerySchema>, "projectSlug"> & {
  projectId: string;
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
      skip: (page - 1) * 100,
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
  searchParams: z.infer<typeof getLinksCountQuerySchema>;
  projectId: string;
  userId?: string | null;
}) {
  const { groupBy, search, domain, tagId, showArchived, withTags } =
    searchParams;

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
      ...(tagIds.length > 0 && {
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

export async function getRandomKey(
  domain: string,
  prefix?: string,
): Promise<string> {
  /* recursively get random key till it gets one that's available */
  let key = nanoid();
  if (prefix) {
    key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
  }
  const response = await checkIfKeyExists(domain, key);
  if (response) {
    // by the off chance that key already exists
    return getRandomKey(domain, prefix);
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
  userId,
  bulk = false,
}: {
  payload: LinkWithTagIdsProps;
  project?: ProjectProps;
  userId?: string;
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

  const tagIds = combineTagIds(payload);

  // url checks
  if (!url) {
    return {
      link: payload,
      error: "Missing destination url.",
      status: 400,
      code: "bad_request",
    };
  }
  const processedUrl = getUrlFromString(url);
  if (!processedUrl) {
    return {
      link: payload,
      error: "Invalid destination url.",
      status: 422,
      code: "unprocessable_entity",
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
        code: "forbidden",
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
        code: "unprocessable_entity",
      };
    }
    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      return {
        link: payload,
        error: "Invalid url.",
        status: 422,
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
        status: 422,
        code: "unprocessable_entity",
      };
    }

    // else, check if the domain belongs to the project
  } else if (!project?.domains?.find((d) => d.slug === domain)) {
    return {
      link: payload,
      error: "Domain does not belong to project.",
      status: 403,
      code: "forbidden",
    };
  }

  if (!key) {
    key = await getRandomKey(domain, payload["prefix"]);
  }

  if (bulk) {
    if (image) {
      return {
        link: payload,
        error: "You cannot set custom social cards with bulk link creation.",
        status: 422,
        code: "unprocessable_entity",
      };
    }
    if (rewrite) {
      return {
        link: payload,
        error: "You cannot use link cloaking with bulk link creation.",
        status: 422,
        code: "unprocessable_entity",
      };
    }
    // we check if a key exists in bulk creation because
    // for regular creation we check it in the addLink function
    const exists = await checkIfKeyExists(domain, key);
    if (exists) {
      return {
        link: payload,
        error: `Link already exists.`,
        status: 409,
        code: "conflict",
      };
    }

    // only perform tag validity checks if:
    // - not bulk creation (we do that check in bulkCreateLinks)
    // - tagIds are present
  } else if (tagIds.length > 0) {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
      },
      where: { projectId: project?.id, id: { in: tagIds } },
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
        status: 422,
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
        status: 422,
        code: "unprocessable_entity",
      };
    }
    // check if expiresAt is in the future
    if (new Date(expiresAt) < new Date()) {
      return {
        link: payload,
        error: "Expiry date must be in the future.",
        status: 422,
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
      // make sure projectId is set to the current project
      projectId: project?.id || null,
      // if userId is passed, set it (we don't change the userId if it's already set, e.g. when editing a link)
      ...(userId && {
        userId,
      }),
    },
    error: null,
    status: 200,
  };
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

export async function addLink(link: LinkWithTagIdsProps) {
  let { domain, key, url, expiresAt, title, description, image, proxy, geo } =
    link;
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  const combinedTagIds = combineTagIds(link);

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  if (proxy && image && uploadedImage) {
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
      image,
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
  let linkTags: { tagId: string; linkId: string }[] = [];

  if (skipPrismaCreate) {
    createdLinks = links;
  } else {
    await prisma.link.createMany({
      data: links.map(({ tagId, tagIds, ...link }) => {
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
          // note: we're creating linkTags separately cause you can't do
          // nested createMany in Prisma: https://github.com/prisma/prisma/issues/5455
        };
      }),
      skipDuplicates: true,
    });

    createdLinks = (await Promise.all(
      links.map(async (link) => {
        const { key, domain, tagId, tagIds } = link;
        const data = await prisma.link.findUnique({
          where: {
            domain_key: {
              domain,
              key,
            },
          },
        });
        if (!data) return null;
        // combine tagIds for creation later
        const combinedTagIds = combineTagIds({ tagId, tagIds });
        linkTags.push(
          ...combinedTagIds.map((tagId) => ({ tagId, linkId: data.id })),
        );
        return data;
      }),
    )) as LinkWithTagIdsProps[];
  }

  const pipeline = redis.pipeline();

  // split links into domains
  const linksByDomain: Record<string, Record<string, RedisLinkProps>> = {};

  const [validTagIds, ..._rest] = await Promise.all([
    prisma.tag
      .findMany({
        where: {
          id: {
            in: linkTags.map(({ tagId }) => tagId),
          },
        },
        select: {
          id: true,
        },
      })
      .then((tags) => tags.map(({ id }) => id)),
    ...createdLinks.map(async (link) => {
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
  ]);

  Object.entries(linksByDomain).forEach(([domain, links]) => {
    pipeline.hset(domain, links);
  });

  await Promise.all([
    pipeline.exec(),
    // create link tags for valid tagIds
    linkTags.length > 0 &&
      prisma.linkTag.createMany({
        data: linkTags.filter(({ tagId }) => validTagIds.includes(tagId)),
        skipDuplicates: true,
      }),
    // update links usage
    prisma.project.update({
      where: {
        id: createdLinks[0].projectId!, // this will always be present
      },
      data: {
        linksUsage: {
          increment: createdLinks.length,
        },
      },
    }),
  ]);

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

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  if (proxy && image) {
    // only upload image to cloudinary if proxy is true and there's an image
    if (uploadedImage) {
      const { secure_url } = await cloudinary.v2.uploader.upload(image, {
        public_id: key,
        folder: domain,
        overwrite: true,
        invalidate: true,
      });
      image = secure_url;
    }
    // if there's no proxy enabled or no image, delete the image in Cloudinary
  } else {
    await cloudinary.v2.uploader.destroy(`${domain}/${key}`, {
      invalidate: true,
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
        image,
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
              notIn: combinedTagIds,
            },
          },
          connectOrCreate: combinedTagIds.map((tagId) => ({
            where: { linkId_tagId: { linkId: id, tagId } },
            create: { tagId },
          })),
        },
      },
    }),
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
      // remove tags when transferring link
      tags: {
        deleteMany: {},
      },
    },
  });
}
