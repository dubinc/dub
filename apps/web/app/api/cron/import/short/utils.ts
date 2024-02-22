import { bulkCreateLinks } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

export const importLinksFromShort = async ({
  projectId,
  userId,
  domainId,
  domain,
  importTags,
  pageToken = null,
  count = 0,
  shortApiKey,
}: {
  projectId: string;
  userId: string;
  domainId: number;
  domain: string;
  importTags?: boolean;
  pageToken?: string | null;
  count?: number;
  shortApiKey: string;
}) => {
  const data = await fetch(
    `https://api.short.io/api/links?domain_id=${domainId}&limit=150${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: shortApiKey,
      },
    },
  ).then((res) => res.json());
  const { links, nextPageToken } = data;

  let tagsToCreate = new Set<string>();
  let allTags: { id: string; name: string }[] = [];

  // convert links to format that can be imported into database
  const importedLinks = links
    .map(
      ({
        originalURL,
        path,
        title,
        iphoneURL,
        androidURL,
        archived,
        tags,
        createdAt,
      }) => {
        // skip the root domain
        if (path.length === 0) {
          return null;
        }
        tags.forEach((tag: string) => tagsToCreate.add(tag));
        return {
          projectId,
          userId,
          domain,
          key: path,
          url: originalURL,
          title,
          ios: iphoneURL,
          android: androidURL,
          archived,
          tags,
          createdAt,
        };
      },
    )
    .filter(Boolean);

  // import tags into database
  if (importTags && tagsToCreate.size > 0) {
    const existingTags = await prisma.tag.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    await prisma.tag.createMany({
      data: Array.from(tagsToCreate)
        // filter out existing tags with the same name
        .filter((tag) => !existingTags.some((t) => t.name === tag))
        .map((tag) => ({
          name: tag,
          color: randomBadgeColor(),
          projectId,
        })),
      skipDuplicates: true,
    });
    allTags = await prisma.tag.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  // bulk create links
  await bulkCreateLinks({
    links: importedLinks.map(({ tags, ...rest }) => {
      return {
        ...rest,
        ...(importTags && {
          tagIds: tags
            .map(
              (tag: string) => allTags.find((t) => t.name === tag)?.id ?? null,
            )
            .filter(Boolean),
        }),
      };
    }),
  });

  count += importedLinks.length;

  console.log({
    importedLinksLength: importedLinks.length,
    count,
    nextPageToken,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!nextPageToken) {
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
      redis.del(`import:short:${projectId}`),

      // send email to user
      sendEmail({
        subject: `Your Short.io links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "Short.io",
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
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/short`,
      body: {
        projectId,
        userId,
        domainId,
        domain,
        pageToken: nextPageToken,
        count,
      },
    });
  }
};
