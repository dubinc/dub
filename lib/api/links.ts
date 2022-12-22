import cloudinary from "cloudinary";
import { DEFAULT_REDIRECTS, RESERVED_KEYS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { getParamsFromURL, nanoid, truncate } from "@/lib/utils";

const getFiltersFromStatus = (status: string) => {
  if (status === "all" || status === "none") {
    return {
      archived: undefined,
      expiresAt: undefined,
    };
  }
  const selectedStatus = status.split(",");
  const activeSelected = selectedStatus.includes("active");
  const expiredSelected = selectedStatus.includes("expired");
  const archivedSelected = selectedStatus.includes("archived");
  return {
    AND: [
      {
        // archived can be either true or false
        archived:
          archivedSelected && selectedStatus.length === 1
            ? true
            : !archivedSelected
            ? false
            : undefined,
      },
      {
        OR: [
          {
            /* expiresAt can be either:
              - null
              - a date that's in the past 
              - a date that's in the future
            */
            expiresAt:
              expiredSelected && !activeSelected
                ? { lt: new Date() }
                : activeSelected && !expiredSelected
                ? { gte: new Date() }
                : undefined,
          },
          {
            expiresAt: activeSelected && !expiredSelected ? null : undefined,
          },
          {
            archived: archivedSelected && !activeSelected ? true : undefined,
          },
        ],
      },
    ],
  };
};

export async function getLinksForProject({
  domain,
  status = "active",
  sort = "createdAt",
  userId,
}: {
  domain: string;
  status?: string;
  sort?: "createdAt" | "clicks"; // always descending for both
  userId?: string;
}): Promise<LinkProps[]> {
  const filters = getFiltersFromStatus(status);
  return await prisma.link.findMany({
    where: {
      domain,
      ...filters,
      ...(userId && { userId }),
    },
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
  });
}

export async function getLinkCountForProject(domain: string) {
  return await prisma.link.count({
    where: {
      domain,
      archived: false,
    },
  });
}

export async function getRandomKey(domain: string): Promise<string> {
  /* recursively get random key till it gets one that's avaialble */
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
    (RESERVED_KEYS.has(key) || DEFAULT_REDIRECTS[key])
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
        url,
        password: hasPassword,
        proxy,
        ios,
        android,
      },
      {
        nx: true,
        // if the key has an expiry, set exat
        ...(exat && { exat }),
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

export async function editLink(link: LinkProps, oldKey: string) {
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
  const uploadedImage = image && image.startsWith("data:image") ? true : false;

  if (changedKey) {
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
        url,
        password: hasPassword,
        proxy,
        ios,
        android,
      },
      {
        // if the key has an expiry, set exat
        ...(exat && { exat }),
      },
    ),
    // if key is changed: rename resource in Cloudinary, delete the old key in Redis and change the clicks key name
    ...(changedKey
      ? [
          cloudinary.v2.uploader
            .destroy(`${domain}/${oldKey}`, {
              invalidate: true,
            })
            .catch(() => {}),
          redis.del(`${domain}:${oldKey}`),
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

/* Change the domain for every link and its respective stats when the project domain is changed */
export async function changeDomainForLinks(
  projectId: string,
  domain: string,
  newDomain: string,
) {
  const links = await prisma.link.findMany({
    where: {
      project: {
        id: projectId,
      },
    },
  });
  const pipeline = redis.pipeline();
  links.forEach(({ key }) => {
    pipeline.rename(`${domain}:${key}`, `${newDomain}:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}

/* Change the domain for all images for a given project on Cloudinary */
export async function changeDomainForImages(
  projectId: string,
  domain: string,
  newDomain: string,
) {
  const links = await prisma.link.findMany({
    where: {
      project: {
        id: projectId,
      },
    },
  });
  try {
    return await Promise.all(
      links.map(({ key }) =>
        cloudinary.v2.uploader.rename(
          `${domain}/${key}`,
          `${newDomain}/${key}`,
          {
            invalidate: true,
          },
        ),
      ),
    );
  } catch (e) {
    return null;
  }
}

/* Delete all links & stats associated with a project when it's deleted */
export async function deleteProjectLinks(domain: string) {
  const links = await prisma.link.findMany({
    where: {
      project: {
        domain,
      },
    },
  });
  const pipeline = redis.pipeline();
  links.forEach(({ key }) => {
    pipeline.del(`${domain}:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}
