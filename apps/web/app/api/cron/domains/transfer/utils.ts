import { getAnalytics } from "@/lib/analytics";
import prisma from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import { Link } from "@prisma/client";
import { sendEmail } from "emails";
import DomainTransferred from "emails/domain-transferred";

// Update links in the redis
export const updateLinksInRedis = async ({
  newWorkspaceId,
  domain,
  links,
}: {
  newWorkspaceId: string;
  domain: string;
  links: Link[];
}) => {
  const pipeline = redis.pipeline();

  const formatedLinks = await Promise.all(
    links.map(async (link) => {
      return {
        ...(await formatRedisLink(link)),
        projectId: newWorkspaceId,
        key: link.key.toLowerCase(),
      };
    }),
  );

  formatedLinks.map((formatedLink) => {
    const { key, ...rest } = formatedLink;

    pipeline.hset(domain, {
      [formatedLink.key]: rest,
    });
  });

  await pipeline.exec();
};

// Update links & click usage
export const updateUsage = async ({
  currentWorkspaceId,
  newWorkspaceId,
  links,
}: {
  currentWorkspaceId: string;
  newWorkspaceId: string;
  links: Link[];
}) => {
  const linkClicks: number[] = await Promise.all(
    links.map((link) =>
      getAnalytics({
        linkId: link.id,
        endpoint: "clicks",
        interval: "30d",
      }),
    ),
  );

  const totalClicks = linkClicks.reduce((acc, curr) => acc + curr, 0);
  const linksCount = links.length;

  await Promise.all([
    prisma.project.update({
      where: {
        id: currentWorkspaceId,
      },
      data: {
        usage: {
          decrement: totalClicks,
        },
        linksUsage: {
          decrement: linksCount,
        },
      },
    }),
    prisma.project.update({
      where: {
        id: newWorkspaceId,
      },
      data: {
        usage: {
          increment: totalClicks,
        },
        linksUsage: {
          increment: linksCount,
        },
      },
    }),
  ]);
};

// Send email to the owner after the domain transfer is completed
export const domainTransferredEmail = async ({
  domain,
  currentWorkspaceId,
  newWorkspaceId,
}: {
  domain: string;
  currentWorkspaceId: string;
  newWorkspaceId: string;
}) => {
  const currentWorkspace = await prisma.project.findUnique({
    where: {
      id: currentWorkspaceId,
    },
    select: {
      users: {
        where: {
          role: "owner",
        },
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  const newWorkspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: newWorkspaceId,
    },
    select: {
      name: true,
      slug: true,
    },
  });

  const ownerEmail = currentWorkspace?.users[0]?.user?.email!;

  sendEmail({
    subject: "Domain transfer completed",
    email: ownerEmail,
    react: DomainTransferred({
      email: ownerEmail,
      domain,
      newWorkspace,
    }),
  });
};
