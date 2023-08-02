"use server";
import { deleteUserLinks } from "#/lib/api/links";
import { hashToken } from "#/lib/auth";
import { DUB_PROJECT_ID } from "#/lib/constants";
import prisma from "#/lib/prisma";
import { getDomainWithoutWWW } from "#/lib/utils";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { get } from "@vercel/edge-config";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";

async function isAdmin() {
  const session = await getServerSession(authOptions);
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
    },
  });

  if (!user) {
    return {
      error: "No user found",
    };
  }

  const blacklistedDomains = await get("domains");
  const blacklistedEmails = await get("emails");

  const ban = await Promise.allSettled([
    deleteUserLinks(user.id),
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
