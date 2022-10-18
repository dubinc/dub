import cloudinary from "cloudinary";
import { DEFAULT_REDIRECTS, RESERVED_KEYS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";

export async function getLinksForProject({
  domain,
  archived = false,
  orderBy = "createdAt",
  userId,
}: {
  domain: string;
  archived?: boolean;
  orderBy?: "createdAt" | "clicks"; // always descending for both
  userId?: string;
}): Promise<LinkProps[]> {
  return await prisma.link.findMany({
    where: {
      domain,
      archived,
      ...(userId && { userId }),
    },
    orderBy: {
      [orderBy]: "desc",
    },
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
  console.log(expiresAt, exat);

  const exists = await checkIfKeyExists(domain, key);
  if (exists) return null;

  let [response, _] = await Promise.all([
    prisma.link.create({
      data: {
        ...link,
        // can't upload base64 image string to mysql, need to upload to cloudinary first
        image: undefined,
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
  const hasPassword = password && password.length > 0;
  const proxy = title && description && image ? true : false;
  const exat = expiresAt ? expiresAt.getTime() : null;
  const changedKey = key !== oldKey;
  const uploadedImage = image && image.startsWith("data:image");

  if (changedKey) {
    const exists = await checkIfKeyExists(domain, key);
    if (exists) return null;
  }

  const [response, ...effects] = await Promise.all([
    prisma.link.update({
      where: {
        id,
      },
      data: {
        ...link,
        // if it's an uploaded image (base64 URI), need to upload to cloudinary first
        image: uploadedImage ? undefined : image,
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

  console.log(effects);

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
