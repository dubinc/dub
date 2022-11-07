import cloudinary from "cloudinary";
import { DEFAULT_REDIRECTS, RESERVED_KEYS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { getParamsFromURL, nanoid } from "@/lib/utils";

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
  const { domain, key, url, expiresAt, password, title, description, image } =
    link;
  const hasPassword = password && password.length > 0 ? true : false;
  const proxy = title && description && image ? true : false;
  const exat = expiresAt ? new Date(expiresAt).getTime() / 1000 : null;

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  let [response, _] = await Promise.all([
    prisma.link.create({
      data: {
        ...link,
        // can't upload base64 image string to mysql, need to upload to cloudinary first
        image: undefined,
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
      },
      {
        nx: true,
        // if the key has an expiry, set exat
        ...(exat && { exat }),
      },
    ),
  ]);
  if (image) {
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
  oldKey: string,
  projectSlug: string,
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
  } = link;
  const hasPassword = password && password.length > 0 ? true : false;
  const proxy = title && description && image ? true : false;
  const exat = expiresAt ? new Date(expiresAt).getTime() : null;
  const changedKey = key !== oldKey;
  const uploadedImage = image && image.startsWith("data:image");

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
        // if it's an uploaded image (base64 URI), need to upload to cloudinary first
        image: uploadedImage ? undefined : image,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
      },
    }),
    // only upload image to cloudinary if it's changed
    uploadedImage &&
      cloudinary.v2.uploader.upload(image, {
        public_id: key,
        folder: domain,
        overwrite: true,
        invalidate: true,
      }),
    redis.set(
      `${domain}:${key}`,
      {
        url,
        password: hasPassword,
        proxy,
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
            .rename(`${domain}/${oldKey}`, `${domain}/${key}`, {
              invalidate: true,
            })
            .catch(() => {}),
          redis.del(`${domain}:${oldKey}`),
          redis
            .rename(`${domain}:clicks:${oldKey}`, `${domain}:clicks:${key}`)
            .catch(() => {}),
        ]
      : []),
    // if this link has custom OG tags and the key is the same, update the proxy cache
    proxy &&
      !changedKey &&
      (await fetch(
        `https://dub.sh/api/projects/${projectSlug}/domains/${domain}/links/${oldKey}/revalidate?secret=${process.env.REVALIDATE_TOKEN}`,
      )),
  ]);
  if (uploadedImage) {
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
    redis.del(`${domain}:clicks:${key}`),
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
