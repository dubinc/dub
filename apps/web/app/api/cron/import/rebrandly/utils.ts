import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

export const importTagsFromRebrandly = async ({
  projectId,
  rebrandlyApiKey,
  lastTagId = null,
}: {
  projectId: string;
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
      name: tag.name,
      color: randomBadgeColor(),
      projectId,
    })),
    skipDuplicates: true,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  return await importTagsFromRebrandly({
    projectId,
    rebrandlyApiKey,
    lastTagId: newLastTagId,
  });
};

export const importLinksFromRebrandly = async ({
  projectId,
  userId,
  domainId,
  domain,
  tagsToId,
  rebrandlyApiKey,
  lastLinkId = null,
  count = 0,
}: {
  projectId: string;
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
      // delete keys from redis
      redis.del(`import:rebrandly:${projectId}`),
      redis.del(`import:rebrandly:${projectId}:tags`),

      // delete tags that have no links
      prisma.tag.deleteMany({
        where: {
          projectId,
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
          projectName: project?.name ?? "",
          projectSlug: project?.slug ?? "",
        }),
      }),
    ]);
    return count;

    // if there are more links, import them
  } else {
    const newLastLinkId = links[links.length - 1].id;

    const pipeline = redis.pipeline();

    // convert links to format that can be imported into database
    const importedLinks = links
      .map(({ title, slashtag, destination, tags, createdAt, updatedAt }) => {
        pipeline.set(
          `${domain}:${slashtag}`,
          {
            url: encodeURIComponent(destination),
          },
          {
            nx: true,
          },
        );

        // if tagsToId is provided and tags array is not empty, get the tagId
        const tagId =
          tagsToId && tags.length > 0 ? tagsToId[tags[0].name] : null;

        return {
          projectId,
          userId,
          domain,
          key: slashtag,
          url: destination,
          title,
          createdAt,
          updatedAt,
          ...(tagId ? { tagId } : {}),
        };
      })
      .filter(Boolean);

    // import links into database
    await Promise.all([
      prisma.link.createMany({
        data: importedLinks,
        skipDuplicates: true,
      }),
      pipeline.exec(),
    ]);

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
        projectId,
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
