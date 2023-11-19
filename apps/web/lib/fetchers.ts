import { cache } from "react";
import { getSession } from "./auth";
import prisma from "./prisma";
import { ProjectWithDomainProps } from "./types";

export const getProjects = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const projects = await prisma.project.findMany({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      domains: true,
    },
  });

  return projects.map((project) => ({
    ...project,
    primaryDomain:
      project.domains.find((domain) => domain.primary) || project.domains[0],
  })) as ProjectWithDomainProps[];
});

export const getProject = cache(async ({ slug }: { slug: string }) => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return await prisma.project.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      usage: true,
      usageLimit: true,
      plan: true,
      stripeId: true,
      billingCycleStart: true,
      createdAt: true,
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
    },
  });
});

export const getLink = cache(
  async ({ domain, key }: { domain: string; key: string }) => {
    return await prisma.link.findUnique({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
    });
  },
);
