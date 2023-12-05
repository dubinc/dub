import { bulkCreateLinks, getRandomKey } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { LinkProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

export const importLinksFromCSV = async ({
  projectId,
  userId,
  domain,
  count = 0,
}: {
  projectId: string;
  userId: string;
  domain: string;
  count?: number;
}) => {
  const [links, totalCount] = await Promise.all([
    redis.lrange<LinkProps>(`import:csv:${projectId}`, count, count + 100),
    redis.llen(`import:csv:${projectId}`),
  ]);

  const processedLinks = await Promise.all(
    links.map(async (link) => ({
      ...link,
      key: link.key || (await getRandomKey(domain)),
      projectId,
      userId,
    })),
  );

  const importedLinks = await bulkCreateLinks(processedLinks);

  count += importedLinks.length;

  console.log({
    importedLinksLength: importedLinks.length,
    count,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (count >= totalCount) {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
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
    const ownerEmail = project?.users[0].user.email ?? "";
    const links = project?.links ?? [];

    await Promise.all([
      // delete key from redis
      redis.del(`import:csv:${projectId}`),

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
          projectName: project?.name ?? "",
          projectSlug: project?.slug ?? "",
        }),
      }),
    ]);
    return count;
  } else {
    // recursively call this function via qstash until nextPageToken is null
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/csv`,
      body: {
        projectId,
        userId,
        domain,
        count,
      },
    });
  }
};
