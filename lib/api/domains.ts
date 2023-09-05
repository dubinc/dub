import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";
import cloudinary from "cloudinary";
import { getApexDomain, validDomainRegex } from "#/lib/utils";
import { isIframeable } from "../middleware/utils";

export const validateDomain = async (
  domain: string,
  projectId?: string | null,
) => {
  if (!domain || typeof domain !== "string") {
    return "Missing domain";
  }
  const validDomain =
    validDomainRegex.test(domain) &&
    // make sure the domain doesn't contain dub.co/dub.sh
    !/^(dub\.co|.*\.dub\.co|dub\.sh|.*\.dub\.sh)$/i.test(domain);

  if (!validDomain) {
    return "Invalid domain";
  }
  const exists = await domainExists(domain, projectId);
  if (exists) {
    return "Domain is already in use.";
  }
  return true;
};

export const domainExists = async (
  domain: string,
  projectId?: string | null,
) => {
  const apexDomain = getApexDomain(`https://${domain}`);
  const response = await prisma.domain.findFirst({
    where: {
      OR: [
        // if someone tries to add "sub.domain.com" but "domain.com" is already in use
        {
          slug: apexDomain,
        },
        // if someone tries to add "domain.com" but "sub.domain.com" is already in use
        {
          slug: {
            endsWith: `.${apexDomain}`,
          },
        },
      ],
    },
    select: {
      slug: true,
      ...(projectId && { projectId: true }),
    },
  });
  if (response) {
    if (projectId && response.projectId === projectId) {
      return false;
    }
    return true;
  }
  return false;
};

interface CustomResponse extends Response {
  json: () => Promise<any>;
  error?: { code: string; projectId: string; message: string };
}

export const addDomainToVercel = async (
  domain: string,
): Promise<CustomResponse> => {
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

export const removeDomainFromVercel = async (domain: string) => {
  const apexDomain = getApexDomain(`https://${domain}`);
  const domainCount = await prisma.domain.count({
    where: {
      OR: [
        {
          slug: apexDomain,
        },
        {
          slug: {
            endsWith: `.${apexDomain}`,
          },
        },
      ],
    },
  });
  if (domainCount > 1) {
    // the apex domain is being used by other domains
    // so we should only remove it from our Vercel project
    return await fetch(
      `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        },
        method: "DELETE",
      },
    ).then((res) => res.json());
  } else {
    // this is the only domain using this apex domain
    // so we can remove it entirely from our Vercel team
    return await fetch(
      `https://api.vercel.com/v6/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        },
        method: "DELETE",
      },
    ).then((res) => res.json());
  }
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

export async function setRootDomain({
  domain,
  target,
  rewrite,
  newDomain,
}: {
  domain: string;
  target: string;
  rewrite: boolean;
  newDomain?: string; // if the domain is changed, this will be the new domain
}) {
  if (newDomain) {
    const pipeline = redis.pipeline();
    pipeline.del(`root:${domain}`);
    pipeline.set(`root:${newDomain}`, {
      target,
      ...(rewrite && {
        rewrite: true,
        iframeable: await isIframeable({ url: target, requestDomain: domain }),
      }),
    });
    return await pipeline.exec();
  } else {
    await redis.set(`root:${domain}`, {
      target,
      ...(rewrite && {
        rewrite: true,
        iframeable: await isIframeable({ url: target, requestDomain: domain }),
      }),
    });
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

/* Delete a domain and all links & images associated with with */
export async function deleteDomainAndLinks(
  domain: string,
  {
    // Note: in certain cases, we don't need to remove the domain from the Prisma
    skipPrismaDelete = false,
  } = {},
) {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
  });
  const pipeline = redis.pipeline();
  links.forEach(({ key }) => {
    pipeline.del(`${domain}:${key}`);
  });
  pipeline.del(`root:${domain}`);
  return await Promise.allSettled([
    pipeline.exec(), // delete all links from redis
    // remove all images from cloudinary
    cloudinary.v2.api.delete_resources_by_prefix(domain),
    // remove the domain from Vercel
    removeDomainFromVercel(domain),
    !skipPrismaDelete &&
      prisma.domain.delete({
        where: {
          slug: domain,
        },
      }),
  ]);
}
