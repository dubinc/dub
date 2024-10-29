import { bulkCreateLinks } from "@/lib/api/links";
import { createId } from "@/lib/api/utils";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

export const importTagsFromRebrandly = async ({
  workspaceId,
  rebrandlyApiKey,
  lastTagId = null,
}: {
  workspaceId: string;
  rebrandlyApiKey: string;
  lastTagId?: string | null;
}) => {
  const tags = (await fetch(
    `https://api.rebrandly.com/v1/tags?orderBy=name&orderDir=desc&limit=25${
      lastTagId ? `&last=${lastTagId}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        apikey: rebrandlyApiKey as string,
      },
    },
  ).then((r) => r.json())) as {
    id: string;
    name: string;
    color: string;
  }[];

  // if no tags left, meaning import is complete
  if (tags.length === 0) {
    return;
  }

  const newLastTagId = tags[tags.length - 1].id;

  // import tags into database
  await prisma.tag.createMany({
    data: tags.map((tag) => ({
      id: createId({ prefix: "tag_" }),
      name: tag.name,
      color: randomBadgeColor(),
      projectId: workspaceId,
    })),
    skipDuplicates: true,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  return await importTagsFromRebrandly({
    workspaceId,
    rebrandlyApiKey,
    lastTagId: newLastTagId,
  });
};

export const importLinksFromRebrandly = async ({
  workspaceId,
  userId,
  domainId,
  domain,
  tagsToId,
  rebrandlyApiKey,
  lastLinkId = null,
  count = 0,
}: {
  workspaceId: string;
  userId: string;
  domainId: number;
  domain: string;
  tagsToId?: Record<string, string>;
  rebrandlyApiKey: string;
  lastLinkId?: string | null;
  count?: number;
}) => {
  const links = await fetch(
    `https://api.rebrandly.com/v1/links?domain.id=${domainId}&orderBy=createdAt&orderDir=asc&limit=25${
      lastLinkId ? `&last=${lastLinkId}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        apikey: rebrandlyApiKey as string,
      },
    },
  ).then((res) => res.json());

  // if no more links, meaning import is complete
  if (links.length === 0) {
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
      // delete keys from redis
      redis.del(`import:rebrandly:${workspaceId}`),
      redis.del(`import:rebrandly:${workspaceId}:tags`),

      // delete tags that have no links
      prisma.tag.deleteMany({
        where: {
          projectId: workspaceId,
          links: {
            none: {},
          },
        },
      }),

      // send email to user
      sendEmail({
        subject: `Your Rebrandly links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "Rebrandly",
          count,
          links,
          domains: [domain],
          workspaceName: workspace?.name ?? "",
          workspaceSlug: workspace?.slug ?? "",
        }),
      }),
    ]);
    return count;

    // if there are more links, import them
  } else {
    const newLastLinkId = links[links.length - 1].id;

    // convert links to format that can be imported into database
    const importedLinks = links
      .map(
        ({ title, slashtag: key, destination, tags, createdAt, updatedAt }) => {
          // if tagsToId is provided and tags array is not empty, get the tagIds
          const tagIds =
            tagsToId && tags.length > 0
              ? tags.map(
                  (tag: {
                    id: string;
                    name: string;
                    color: string;
                    active: boolean;
                    clicks: number;
                  }) => tagsToId[tag.name],
                )
              : [];

          return {
            projectId: workspaceId,
            userId,
            domain,
            key,
            url: destination,
            title,
            createdAt,
            updatedAt,
            tagIds,
          };
        },
      )
      .filter(Boolean);

    // check if links are already in the database
    const alreadyCreatedLinks = await prisma.link.findMany({
      where: {
        domain,
        key: {
          in: importedLinks.map((link) => link.key),
        },
      },
      select: {
        key: true,
      },
    });

    // filter out links that are already in the database
    const linksToCreate = importedLinks.filter(
      (link) => !alreadyCreatedLinks.some((l) => l.key === link.key),
    );

    // bulk create links
    await bulkCreateLinks({ links: linksToCreate });

    count += importedLinks.length;

    console.log({
      importedLinksLength: importedLinks.length,
      count,
      newLastLinkId,
    });

    // wait 500 ms before making another request
    await new Promise((resolve) => setTimeout(resolve, 500));

    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rebrandly`,
      body: {
        workspaceId,
        userId,
        domainId,
        domain,
        importTags: tagsToId ? true : false,
        lastLinkId: newLastLinkId,
        count,
      },
    });
  }
};
