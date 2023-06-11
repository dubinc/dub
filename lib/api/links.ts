import cloudinary from "cloudinary";
import { DEFAULT_REDIRECTS } from "#/lib/constants";
import prisma from "#/lib/prisma";
import { LinkProps } from "#/lib/types";
import { redis } from "#/lib/upstash";
import {
  getParamsFromURL,
  isReservedKey,
  nanoid,
  truncate,
  validKeyRegex,
} from "#/lib/utils";
import { NextApiRequest } from "next";

export async function getLinksForProject({
  projectId,
  domain,
  tagId,
  search,
  sort = "createdAt",
  userId,
  showArchived,
}: {
  projectId: string;
  domain?: string;
  tagId?: string;
  search?: string;
  sort?: "createdAt" | "clicks"; // always descending for both
  userId?: string | null;
  showArchived?: boolean;
}): Promise<LinkProps[]> {
  /*
  TODO: add pagination
  */
  return await prisma.link.findMany({
    where: {
      projectId,
      archived: showArchived ? undefined : false,
      ...(domain && { domain }),
      ...(search && {
        key: { search },
        url: { search },
      }),
      ...(tagId && { tagId }),
      ...(userId && { userId }),
    },
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
  });
}

export async function getLinksCount({
  req,
  projectId,
  userId,
}: {
  req: NextApiRequest;
  projectId: string;
  userId?: string | null;
}) {
  let { groupBy, search, domain, tagId, showArchived } = req.query as {
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
          key: { search },
          url: { search },
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
        ...(userId && { userId }),
        ...(search && {
          key: { search },
          url: { search },
        }),
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
  if (
    domain === "dub.sh" &&
    ((await isReservedKey(key)) || DEFAULT_REDIRECTS[key])
  ) {
    return true; // reserved keys for dub.sh
  }
  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
  });
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
    ios,
    android,
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;
  const exat = expiresAt ? new Date(expiresAt).getTime() / 1000 : null;
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
      },
    }),
    redis.set(
      `${domain}:${key}`,
      {
        url: encodeURIComponent(url),
        password: hasPassword,
        proxy,
        ios,
        android,
      },
      {
        nx: true,
        // if the key has an expiry, set exat (type any cause there's a type error in the @types)
        ...(exat && { exat: exat as any }),
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
  return response;
}

export async function editLink(
  link: LinkProps,
  {
    oldDomain,
    oldKey,
  }: {
    oldDomain: string;
    oldKey: string;
  },
) {
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
    ios,
    android,
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;
  const exat = expiresAt ? new Date(expiresAt).getTime() : null;
  const changedKey = key !== oldKey;
  const changedDomain = domain !== oldDomain;
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  if (changedDomain || changedKey) {
    const exists = await checkIfKeyExists(domain, key);
    if (exists) return null;
  }
  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  const [response, ...effects] = await Promise.all([
    prisma.link.update({
      where: {
        id,
      },
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
    redis.set(
      `${domain}:${key}`,
      {
        url: encodeURIComponent(url),
        password: hasPassword,
        proxy,
        ios,
        android,
      },
      exat ? { exat } : {},
    ),
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

  return response;
}

export async function deleteLink(domain: string, key: string) {
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

/* Delete all dub.sh links associated with a user when it's deleted */
export async function deleteUserLinks(userId: string) {
  const links = await prisma.link.findMany({
    where: {
      userId,
      domain: "dub.sh",
    },
    select: {
      key: true,
      proxy: true,
    },
  });
  const pipeline = redis.pipeline();
  links.forEach(({ key }) => {
    pipeline.del(`dub.sh:${key}`);
  });
  const [deleteRedis, deleteCloudinary, deletePrisma] =
    await Promise.allSettled([
      pipeline.exec(), // delete all links from redis
      // remove all images from cloudinary
      ...links.map(({ key, proxy }) =>
        proxy
          ? cloudinary.v2.uploader.destroy(`dub.sh/${key}`, {
              invalidate: true,
            })
          : Promise.resolve(),
      ),
      prisma.link.deleteMany({
        where: {
          userId,
          domain: "dub.sh",
        },
      }),
    ]);
  return {
    deleteRedis,
    deleteCloudinary,
    deletePrisma,
  };
}
