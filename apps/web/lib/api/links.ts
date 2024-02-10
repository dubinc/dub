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
import {
  LinkProps,
  NewLinkProps,
  ProjectProps,
  RedisLinkProps,
} from "../types";
import { Session } from "../auth";
import { getLinkViaEdge } from "../planetscale";
import { GetLinksCountParams } from "../zod";
import { DubApiError } from "../errors";

export async function getLinksForProject({
  projectId,
  domain,
  tagId,
  search,
  sort = "createdAt",
  page,
  userId,
  showArchived,
}: {
  projectId: string;
  domain?: string;
  tagId?: string | null;
  search?: string;
  sort?: "createdAt" | "clicks" | "lastClicked"; // descending for all
  page?: number;
  userId?: string | null;
  showArchived?: boolean;
}): Promise<LinkProps[]> {
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
      ...(tagId && { tagId }),
      ...(userId && { userId }),
    },
    include: {
      user: true,
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
  searchParams: GetLinksCountParams;
  projectId: string;
  userId?: string | null;
}) {
  let { groupBy, search, domain, tagId, showArchived } = searchParams;

  if (groupBy) {
    return await prisma.link.groupBy({
      by: [groupBy],
      where: {
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
        // when filtering by tagId, only filter by tagId if the filter group is not "Tags"
        ...(tagId &&
          groupBy !== "tagId" && {
            tagId,
          }),
        // for the "Tags" filter group, only count links that have a tagId
        ...(groupBy === "tagId" && {
          NOT: {
            tagId: null,
          },
        }),
      },
      _count: true,
      orderBy: {
        _count: {
          [groupBy]: "desc",
        },
      },
    });
  } else {
    return await prisma.link.count({
      where: {
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
        ...(domain && { domain }),
        ...(tagId && { tagId }),
      },
    });
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
  payload: NewLinkProps;
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

  const processedUrl = getUrlFromString(url);
  if (!processedUrl) {
    throw new DubApiError({
      code: "unprocessible_entity",
      message: "Invalid destination url.",
    });
  }

  // free plan restrictions
  if (!project || project.plan === "free") {
    if (proxy || password || rewrite || expiresAt || ios || android || geo) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only use custom social media cards, password-protection, link cloaking, link expiration, device and geo targeting on a Pro plan and above. Upgrade to Pro to use these features.",
      });
    }
    // can't use `/` in key on free plan
    if (key?.includes("/")) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message:
          "Key cannot contain '/'. You can only use this on a Pro plan and above. Upgrade to Pro to use this feature.",
      });
    }
  }

  // if domain is not defined, set it to the project's primary domain
  if (!domain) {
    domain = project?.domains?.find((d) => d.primary)?.slug || SHORT_DOMAIN;
  }

  // checks for default short domain
  if (domain === SHORT_DOMAIN) {
    const keyBlacklisted = await isBlacklistedKey(key!);
    if (keyBlacklisted) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message: "Invalid key.",
      });
    }
    const domainBlacklisted = await isBlacklistedDomain(url);
    if (domainBlacklisted) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message: "Invalid url.",
      });
    }

    // checks for other Dub-owned domains (chatg.pt, spti.fi, etc.)
  } else if (isDubDomain(domain)) {
    // coerce type with ! cause we already checked if it exists
    const { allowedHostnames } = DUB_DOMAINS.find((d) => d.slug === domain)!;
    const urlDomain = getDomainWithoutWWW(url) || "";
    if (!allowedHostnames.includes(urlDomain)) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message: `Invalid url. You can only use ${domain} short links for URLs starting with ${allowedHostnames
          .map((d) => `\`${d}\``)
          .join(", ")}.`,
      });
    }

    // else, check if the domain belongs to the project
  } else if (!project?.domains?.find((d) => d.slug === domain)) {
    throw new DubApiError({
      code: "forbidden",
      message: "Domain does not belong to project.",
    });
  }

  if (!key) {
    key = await getRandomKey(domain);
  }

  if (bulk) {
    if (image) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message: "You cannot set custom social cards with bulk link creation.",
      });
    }
    if (rewrite) {
      throw new DubApiError({
        code: "unprocessible_entity",
        message: "You cannot use link cloaking with bulk link creation.",
      });
    }
    const exists = await checkIfKeyExists(domain, key);
    if (exists) {
      throw new DubApiError({
        code: "conflict",
        message: "Link already exists.",
      });
    }
  }

  // custom social media image checks
  const uploadedImage = image && image.startsWith("data:image") ? true : false;
  if (uploadedImage && !process.env.CLOUDINARY_URL) {
    throw new DubApiError({
      code: "unprocessible_entity",
      message: "Missing Cloudinary environment variable.",
    });
  }

  // remove shortLink & qrCode attributes from payload since it's a polyfill
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

export async function addLink(
  link: Awaited<ReturnType<typeof processLink>>["link"],
) {
  const { domain, key, url, expiresAt, title, description, image, proxy, geo } =
    link;
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  let response = await prisma.link.create({
    data: {
      ...link,
      key,
      title: title ? truncate(title, 120) : null,
      description: description ? truncate(description, 240) : null,
      image: uploadedImage ? undefined : image,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || undefined,
    },
  });

  if (proxy && image) {
    const { secure_url } = await cloudinary.v2.uploader.upload(image, {
      public_id: key,
      folder: domain,
      overwrite: true,
      invalidate: true,
    });
    response = await prisma.link.update({
      where: {
        id: response.id,
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

export async function bulkCreateLinks(
  links: Awaited<ReturnType<typeof processLink>>["link"][],
) {
  if (links.length === 0) return [];

  await prisma.link.createMany({
    data: links.map((link) => {
      const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
        getParamsFromURL(link.url);
      return {
        ...link,
        title: link.title ? truncate(link.title, 120) : null,
        description: link.description ? truncate(link.description, 240) : null,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
        geo: link.geo || undefined,
      };
    }),
    skipDuplicates: true,
  });

  const createdLinks = (await Promise.all(
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

  const pipeline = redis.pipeline();

  // split links into domains
  const linksByDomain: Record<string, Record<string, RedisLinkProps>> = {};

  // this technically will be a synchronous function since isIframeable won't be run for bulk link creation
  await Promise.all(
    createdLinks.map(async (link) => {
      const { domain, key } = link;

      if (!linksByDomain[domain]) {
        linksByDomain[domain] = {};
      }
      const formattedLink = await formatRedisLink(link);

      linksByDomain[domain][key.toLowerCase()] = formattedLink;
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
  updatedLink: LinkProps;
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
  const { id: _, clicks, lastClicked, updatedAt, ...rest } = updatedLink;

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
      },
    }),
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
    redis.hset(domain, {
      [key.toLowerCase()]: await formatRedisLink(updatedLink),
    }),
    // if key is changed: rename resource in Cloudinary, delete the old key in Redis and change the clicks key name
    ...(changedDomain || changedKey
      ? [
          cloudinary.v2.uploader
            .destroy(`${oldDomain}/${oldKey}`, {
              invalidate: true,
            })
            .catch(() => {}),
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

export async function deleteLink({
  domain = SHORT_DOMAIN,
  key,
  projectId,
}: {
  domain?: string;
  key: string;
  projectId?: string;
}) {
  return await Promise.all([
    prisma.link.delete({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
    }),
    cloudinary.v2.uploader.destroy(`${domain}/${key}`, {
      invalidate: true,
    }),
    redis.hdel(domain, key.toLowerCase()),
    projectId &&
      prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          linksUsage: {
            decrement: 1,
          },
        },
      }),
  ]);
}

export async function archiveLink(
  domain: string,
  key: string,
  archived = true,
) {
  return await prisma.link.update({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    data: {
      archived,
    },
  });
}
