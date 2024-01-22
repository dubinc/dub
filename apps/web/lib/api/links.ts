import {
  isBlacklistedDomain,
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
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
import { isIframeable } from "../middleware/utils";
import { LinkProps, ProjectProps } from "../types";
import { Session } from "../auth";
import { getLinkViaEdge } from "../planetscale";

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
  tagId?: string;
  search?: string;
  sort?: "createdAt" | "clicks" | "lastClicked"; // descending for all
  page?: string;
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
      skip: (parseInt(page) - 1) * 100,
    }),
  });

  return links.map((link) => ({
    ...link,
    shortLink: linkConstructor({
      domain: link.domain,
      key: link.key,
    }),
  }));
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
  let { groupBy, search, domain, tagId, showArchived } = searchParams as {
    groupBy?: "domain" | "tagId";
    search?: string;
    domain?: string;
    tagId?: string;
    showArchived?: boolean;
  };

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

export async function getRandomKey(domain: string): Promise<string> {
  /* recursively get random key till it gets one that's available */
  const key = nanoid();
  const response = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
  });
  if (response) {
    // by the off chance that key already exists
    return getRandomKey(domain);
  } else {
    return key;
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
  payload: LinkProps;
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
    if (proxy || rewrite || expiresAt || ios || android || geo) {
      return {
        link: payload,
        error:
          "You can only use link cloaking, custom social media cards, link expiration, device and geo targeting on a Pro plan and above. Upgrade to Pro to use these features.",
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

  // remove shortLink attribute from payload since it's a polyfill
  delete payload["shortLink"];

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

export async function addLink(link: LinkProps) {
  const {
    domain,
    key,
    url,
    expiresAt,
    password,
    title,
    description,
    image,
    proxy,
    rewrite,
    ios,
    android,
    geo,
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  let [response, _] = await Promise.all([
    prisma.link.create({
      data: {
        ...link,
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
    redis.set(
      `${domain}:${key}`,
      {
        url: encodeURIComponent(url),
        password: hasPassword,
        proxy,
        ...(rewrite && {
          rewrite: true,
          iframeable: await isIframeable({ url, requestDomain: domain }),
        }),
        ...(expiresAt && { expiresAt }),
        ...(ios && { ios }),
        ...(android && { android }),
        ...(geo && { geo }),
      },
      {
        nx: true,
      },
    ),
  ]);

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
  return {
    ...response,
    shortLink: linkConstructor({
      domain: response.domain,
      key: response.key,
    }),
  };
}

export async function bulkCreateLinks(links: LinkProps[]) {
  if (links.length === 0) return [];
  const pipeline = redis.pipeline();
  links.forEach(({ domain, key, url, password, expiresAt }) => {
    const hasPassword = password && password.length > 0 ? true : false;
    pipeline.set(
      `${domain}:${key}`,
      {
        url: encodeURIComponent(url),
        password: hasPassword,
        ...(expiresAt && { expiresAt }),
      },
      {
        nx: true,
      },
    );
  });

  await Promise.all([
    prisma.link.createMany({
      data: links.map((link) => {
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
        };
      }),
      skipDuplicates: true,
    }),
    pipeline.exec(),
  ]);

  const createdLinks = await Promise.all(
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
  );

  return createdLinks.map((link) => ({
    ...link,
    shortLink: linkConstructor({
      domain: link?.domain,
      key: link?.key,
    }),
  }));
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
    password,
    title,
    description,
    image,
    proxy,
    rewrite,
    ios,
    android,
    geo,
  } = updatedLink;
  const hasPassword = password && password.length > 0 ? true : false;
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
    redis.set(`${domain}:${key}`, {
      url: encodeURIComponent(url),
      password: hasPassword,
      proxy,
      ...(rewrite && {
        rewrite: true,
        iframeable: await isIframeable({ url, requestDomain: domain }),
      }),
      ...(expiresAt && { expiresAt }),
      ...(ios && { ios }),
      ...(android && { android }),
      ...(geo && { geo }),
    }),
    // if key is changed: rename resource in Cloudinary, delete the old key in Redis and change the clicks key name
    ...(changedDomain || changedKey
      ? [
          cloudinary.v2.uploader
            .destroy(`${oldDomain}/${oldKey}`, {
              invalidate: true,
            })
            .catch(() => {}),
          redis.del(`${oldDomain}:${oldKey}`),
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

  return {
    ...response,
    shortLink: linkConstructor({
      domain: response.domain,
      key: response.key,
    }),
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
    redis.del(`${domain}:${key}`),
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
