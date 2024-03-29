import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import {
  getApexDomain,
  getDomainWithoutWWW,
  isIframeable,
  validDomainRegex,
} from "@dub/utils";
import { storage } from "../storage";
import { recordLink } from "../tinybird";

export const validateDomain = async (domain: string) => {
  if (!domain || typeof domain !== "string") {
    return "Missing domain";
  }
  const validDomain =
    validDomainRegex.test(domain) &&
    // make sure the domain doesn't contain dub.co/dub.sh/d.to
    !/^(dub\.co|.*\.dub\.co|dub\.sh|.*\.dub\.sh|d\.to|.*\.d\.to)$/i.test(
      domain,
    );

  if (!validDomain) {
    return "Invalid domain";
  }
  const exists = await domainExists(domain);
  if (exists) {
    return "Domain is already in use.";
  }
  return true;
};

export const domainExists = async (domain: string) => {
  const response = await prisma.domain.findUnique({
    where: {
      slug: domain,
    },
    select: {
      slug: true,
    },
  });
  return !!response;
};

interface CustomResponse extends Response {
  json: () => Promise<any>;
  error?: { code: string; projectId: string; message: string };
}

export const addDomainToVercel = async (
  domain: string,
  {
    redirectToApex,
  }: {
    redirectToApex?: boolean;
  } = {},
): Promise<CustomResponse> => {
  return await fetch(
    `https://api.vercel.com/v10/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: domain.toLowerCase(),
        ...(redirectToApex && {
          redirect: getDomainWithoutWWW(domain.toLowerCase()),
        }),
      }),
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
    // the apex domain is being used by other domains on Dub
    // so we should only remove it from our Vercel project
    return await fetch(
      `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain.toLowerCase()}?teamId=${process.env.TEAM_ID_VERCEL}`,
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
      `https://api.vercel.com/v6/domains/${domain.toLowerCase()}?teamId=${process.env.TEAM_ID_VERCEL}`,
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
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain.toLowerCase()}?teamId=${process.env.TEAM_ID_VERCEL}`,
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
    `https://api.vercel.com/v6/domains/${domain.toLowerCase()}/config?teamId=${process.env.TEAM_ID_VERCEL}`,
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
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain.toLowerCase()}/verify?teamId=${process.env.TEAM_ID_VERCEL}`,
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
  id,
  domain,
  projectId,
  url,
  rewrite,
  newDomain,
}: {
  id: string;
  domain: string;
  projectId: string;
  url?: string;
  rewrite?: boolean;
  newDomain?: string; // if the domain is changed, this will be the new domain
}) {
  if (newDomain) {
    await redis.rename(domain, newDomain);
  }
  return await Promise.all([
    redis.hset(newDomain || domain, {
      _root: {
        id,
        ...(url && {
          url,
        }),
        ...(url &&
          rewrite && {
            rewrite: true,
            iframeable: await isIframeable({
              url,
              requestDomain: newDomain || domain,
            }),
          }),
        projectId,
      },
    }),
    recordLink({
      link: {
        id,
        domain: newDomain || domain,
        key: "_root",
        url: url || "",
        projectId,
      },
    }),
  ]);
}

/* Delete a domain and all links & images associated with it */
export async function deleteDomainAndLinks(
  domain: string,
  {
    // Note: in certain cases, we don't need to remove the domain from the Prisma
    skipPrismaDelete = false,
  } = {},
) {
  const [domainData, allLinks] = await Promise.all([
    prisma.domain.findUnique({
      where: {
        slug: domain,
      },
      select: {
        id: true,
        target: true,
        projectId: true,
      },
    }),
    prisma.link.findMany({
      where: {
        domain,
      },
      select: {
        id: true,
        domain: true,
        key: true,
        url: true,
        projectId: true,
        tags: true,
      },
    }),
  ]);
  if (!domainData) {
    return null;
  }
  return await Promise.allSettled([
    // delete all links from redis
    redis.del(domain),
    // record deletes in tinybird for domain & links
    recordLink({
      link: {
        id: domainData.id,
        domain,
        key: "_root",
        url: domainData.target || "",
        projectId: domainData.projectId,
      },
      deleted: true,
    }),
    ...allLinks.flatMap((link) => [
      recordLink({
        link,
        deleted: true,
      }),
      storage.delete(`images/${link.id}`),
    ]),
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
