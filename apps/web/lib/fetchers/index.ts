import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { getServerSession } from "../better-auth/get-session";

export const getDefaultWorkspace = cache(async () => {
  const { user } = await getServerSession();

  if (!user) {
    return null;
  }

  return await prisma.project.findFirst({
    where: {
      users: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      slug: true,
    },
  });
});

export const getWorkspace = cache(async ({ slug }: { slug: string }) => {
  const { user } = await getServerSession();

  if (!user) {
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
          userId: user.id,
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
