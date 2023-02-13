import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import cloudinary from "cloudinary";
import { validDomainRegex } from "@/lib/utils";

export const validateDomain = async (domain: string) => {
  if (!domain || typeof domain !== "string") {
    return "Missing domain";
  }
  const validDomain =
    validDomainRegex.test(domain) && !domain.endsWith(".dub.sh");

  if (!validDomain) {
    return "Invalid domain";
  }
  const domainExists = await prisma.domain.findUnique({
    where: {
      slug: domain,
    },
    select: {
      slug: true,
    },
  });
  if (domainExists) {
    return "Domain is already in use.";
  }
  return true;
};

interface CustomResponse extends Response {
  json: () => Promise<any>;
  error?: { code: string; projectId: string; message: string };
}

export const addDomain = async (domain: string): Promise<CustomResponse> => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      body: `{\n  "name": "${domain}"\n}`,
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  ).then((res) => res.json());
};

export const removeDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      method: "DELETE",
    },
  ).then((res) => res.json());
};

export const getDomainResponse = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => {
    return res.json();
  });
};

export const getConfigResponse = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain}/config?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());
};

export const verifyDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}/verify?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());
};

export async function setRootDomain(
  domain: string,
  target: string,
  rewrite: boolean,
  newDomain?: string, // if the domain is changed, this will be the new domain
) {
  if (newDomain) {
    const pipeline = redis.pipeline();
    pipeline.del(`root:${domain}`);
    pipeline.set(`root:${newDomain}`, { target, rewrite });
    return await pipeline.exec();
  } else {
    await redis.set(`root:${domain}`, { target, rewrite });
  }
}

export async function deleteRootDomainAndLinks(domain: string) {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    select: {
      key: true,
    },
  });
  const pipeline = redis.pipeline();
  links.forEach(({ key }) => {
    pipeline.del(`${domain}:${key}`);
  });
  pipeline.del(`root:${domain}`);
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}

/* Change the domain for every link and its respective stats when the project domain is changed */
export async function changeDomainForLinks(domain: string, newDomain: string) {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    select: {
      key: true,
    },
  });
  if (links.length === 0) return null;
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
export async function changeDomainForImages(domain: string, newDomain: string) {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    select: {
      key: true,
    },
  });
  if (links.length === 0) return null;
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

/* Delete all links & stats associated with a domain when it's deleted */
export async function deleteDomainLinks(domain: string) {
  const links = await prisma.link.findMany({
    where: {
      domain,
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
