"use server";
import { reassignUserLinks } from "@/lib/api/links";
import { deleteProject } from "@/lib/api/project";
import { getSession, hashToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import {
  DUB_PROJECT_ID,
  LEGAL_USER_ID,
  SHORT_DOMAIN,
  getDomainWithoutWWW,
} from "@dub/utils";
import { get } from "@vercel/edge-config";
import { randomBytes } from "crypto";

async function isAdmin() {
  const session = await getSession();
  if (!session?.user) return false;
  const response = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        // @ts-ignore
        userId: session.user.id,
        projectId: DUB_PROJECT_ID,
      },
    },
  });
  if (!response) return false;
  return true;
}

async function getImpersonateUrl(email: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + 60000),
    },
  });

  const params = new URLSearchParams({
    callbackUrl: process.env.NEXTAUTH_URL as string,
    email,
    token,
  });

  return `${process.env.NEXTAUTH_URL}/api/auth/callback/email?${params}`;
}

export async function getUser(data: FormData) {
  const email = data.get("email") as string;

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const response = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      email: true,
    },
  });

  if (!response?.email) {
    return {
      error: "No user found",
    };
  }

  return {
    email: response.email,
    impersonateUrl: await getImpersonateUrl(response.email),
  };
}

export async function getProjectOwner(data: FormData) {
  const slug = data.get("slug") as string;

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const response = await prisma.user.findFirst({
    where: {
      projects: {
        some: {
          project: {
            slug,
          },
          role: "owner",
        },
      },
    },
    select: {
      email: true,
    },
  });

  if (!response?.email) {
    return {
      error: "No user found",
    };
  }

  return {
    email: response.email,
    impersonateUrl: await getImpersonateUrl(response.email),
  };
}

export async function getUserByKey(data: FormData) {
  const key = data.get("key") as string;

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const response = await prisma.user.findFirst({
    where: {
      links: {
        some: {
          domain: "dub.sh",
          key,
        },
      },
    },
    select: {
      email: true,
      links: {
        where: {
          domain: "dub.sh",
        },
        select: {
          key: true,
          url: true,
        },
      },
      projects: {
        where: {
          role: "owner",
        },
        select: {
          project: {
            select: {
              name: true,
              slug: true,
              plan: true,
              domains: {
                select: {
                  slug: true,
                  verified: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!response?.email) {
    return {
      error: "No user found",
    };
  }

  const { email, links, projects } = response;

  const hostnames = new Set<string>();

  links.map((link) => {
    const hostname = getDomainWithoutWWW(link.url);
    hostname && hostnames.add(hostname);
  });

  const verifiedDomains = projects
    .filter(({ project }) => {
      return project.domains.some(({ verified }) => verified);
    })
    .flatMap(({ project }) => project.domains.map(({ slug }) => slug));

  return {
    email: response?.email as string,
    hostnames: Array.from(hostnames),
    proProjectSlugs:
      projects
        .filter(({ project }) => project.plan === "pro")
        .map(({ project }) => project.slug) || [],
    verifiedDomains: verifiedDomains || [],
    impersonateUrl: await getImpersonateUrl(email),
  };
}

export async function banUser(data: FormData) {
  const email = data.get("email") as string;
  const hostnames = data.getAll("hostname") as string[];

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      projects: {
        where: {
          role: "owner",
        },
        select: {
          project: {
            select: {
              id: true,
              slug: true,
              logo: true,
              stripeId: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      error: "No user found",
    };
  }

  const blacklistedDomains = (await get("domains")) as string[];
  const blacklistedEmails = (await get("emails")) as string[];

  const ban = await Promise.allSettled([
    reassignUserLinks(user.id),
    fetch(
      `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "update",
              key: "domains",
              value: [...blacklistedDomains, ...hostnames],
            },
            {
              operation: "update",
              key: "emails",
              value: [...blacklistedEmails, email],
            },
          ],
        }),
      },
    ).then((res) => res.json()),
    ...user.projects.map(({ project }) =>
      deleteProject({
        id: project.id,
        slug: project.slug,
        stripeId: project.stripeId || undefined,
        logo: project.logo || undefined,
      }),
    ),
  ]);

  const response = await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        ban,
        response,
      },
      null,
      2,
    ),
  );

  return true;
}

export async function getLinkByKey(data: FormData) {
  const key = data.get("key") as string;

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: "dub.sh",
        key,
      },
    },
    select: {
      key: true,
      url: true,
    },
  });
  if (!link) {
    return {
      error: "No link found",
    };
  }

  return {
    key: link?.key as string,
    url: link?.url as string,
    domain: getDomainWithoutWWW(link?.url as string),
  };
}

export async function deleteAndBlacklistLink(data: FormData) {
  const key = data.get("key") as string;
  const url = data.get("url") as string;
  const hostnames = data.getAll("hostname") as string[];

  if (!(await isAdmin())) {
    return {
      error: "Unauthorized",
    };
  }

  const blacklistedDomains = (await get("domains")) as string[];

  const response = await Promise.allSettled([
    redis.set(`${SHORT_DOMAIN}:${key}`, {
      url: encodeURIComponent(url),
      banned: true,
    }),
    prisma.link.update({
      where: {
        domain_key: {
          domain: SHORT_DOMAIN,
          key,
        },
      },
      data: {
        userId: LEGAL_USER_ID,
      },
    }),
    fetch(
      `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "update",
              key: "domains",
              value: [...blacklistedDomains, ...hostnames],
            },
          ],
        }),
      },
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        response,
      },
      null,
      2,
    ),
  );

  return true;
}
