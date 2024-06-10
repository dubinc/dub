import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { NewLinkProps, ProcessedLinkProps, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

export const importLinksFromCSV = async ({
  workspaceId,
  userId,
  domain,
  count = 0,
}: {
  workspaceId: string;
  userId: string;
  domain: string;
  count?: number;
}) => {
  const [links, totalCount] = await Promise.all([
    redis.lrange<NewLinkProps>(`import:csv:${workspaceId}`, count, count + 100),
    redis.llen(`import:csv:${workspaceId}`),
  ]);

  const workspace = (await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      domains: true,
    },
  })) as unknown as WorkspaceProps;

  const processedLinks = await Promise.all(
    links.map(async (link) =>
      processLink({ payload: link, workspace, userId, bulk: true }),
    ),
  );

  const validLinks = processedLinks
    .filter(({ error }) => error == null)
    .map(({ link }) => link) as ProcessedLinkProps[];

  const alreadyCreatedLinks = await prisma.link.findMany({
    where: {
      domain,
      key: {
        in: validLinks.map((link) => link.key),
      },
    },
    select: {
      key: true,
    },
  });

  const importedLinks = await bulkCreateLinks({
    links: validLinks.filter(
      (link) => !alreadyCreatedLinks.some((l) => l.key === link.key),
    ),
  });

  count += links.length;

  console.log({
    count,
    totalCount,
    importedLinks: importedLinks.length,
    remainder: totalCount - count,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (count >= totalCount) {
    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        name: true,
        slug: true,
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
        links: {
          select: {
            domain: true,
            key: true,
            createdAt: true,
          },
          where: {
            domain,
          },
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    const ownerEmail = workspace?.users[0].user.email ?? "";
    const links = workspace?.links ?? [];

    await Promise.all([
      // delete key from redis
      redis.del(`import:csv:${workspaceId}`),

      // send email to user
      sendEmail({
        subject: `Your CSV links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "CSV",
          count,
          links,
          domains: [domain],
          workspaceName: workspace?.name ?? "",
          workspaceSlug: workspace?.slug ?? "",
        }),
      }),
    ]);
    return count;
  } else {
    // recursively call this function via qstash until nextPageToken is null
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
      body: {
        workspaceId,
        userId,
        domain,
        count,
      },
    });
  }
};
