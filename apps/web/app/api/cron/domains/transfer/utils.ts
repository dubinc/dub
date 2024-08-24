import { prisma } from "@/lib/prisma";
import { formatRedisLink, redis } from "@/lib/upstash";
import { Link } from "@prisma/client";
import { sendEmail } from "emails";
import DomainTransferred from "emails/domain-transferred";

// Update links in redis
export const updateLinksInRedis = async ({
  newWorkspaceId,
  domain,
  links,
}: {
  newWorkspaceId: string;
  domain: string;
  links: (Link & { webhookIds: string[] })[];
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

    pipeline.hset(domain.toLowerCase(), {
      [formatedLink.key]: rest,
    });
  });

  await pipeline.exec();
};

// Send email to the owner after the domain transfer is completed
export const sendDomainTransferredEmail = async ({
  domain,
  currentWorkspaceId,
  newWorkspaceId,
  linksCount,
}: {
  domain: string;
  currentWorkspaceId: string;
  newWorkspaceId: string;
  linksCount: number;
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

  await sendEmail({
    subject: "Domain transfer completed",
    email: ownerEmail,
    react: DomainTransferred({
      email: ownerEmail,
      domain,
      newWorkspace,
      linksCount,
    }),
  });
};
