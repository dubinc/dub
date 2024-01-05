import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { sendEmail } from "emails";
import LinksImported from "emails/links-imported";

// Note: rate limit for /groups/{group_guid}/bitlinks is 1500 per hour or 150 per minute
export const importLinksFromBitly = async ({
  projectId,
  userId,
  bitlyGroup,
  domains,
  tagsToId,
  bitlyApiKey,
  searchAfter = null,
  count = 0,
}: {
  projectId: string;
  userId: string;
  bitlyGroup: string;
  domains: string[];
  tagsToId?: Record<string, string>;
  bitlyApiKey: string;
  searchAfter?: string | null;
  count?: number;
}) => {
  const data = await fetch(
    `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/bitlinks?size=100${
      searchAfter ? `&search_after=${searchAfter}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bitlyApiKey}`,
      },
    },
  ).then((res) => res.json());
  const { links, pagination } = data;
  const nextSearchAfter = pagination.search_after;

  const pipeline = redis.pipeline();

  // convert links to format that can be imported into database
  const importedLinks = links.flatMap(
    ({
      id,
      long_url: url,
      title,
      archived,
      created_at,
      custom_bitlinks,
      tags,
    }) => {
      const [domain, key] = id.split("/");
      // if domain is not in project domains, skip (could be a bit.ly link or old short domain)
      if (!domains.includes(domain)) {
        return [];
      }
      pipeline.set(
        `${domain}:${key}`,
        {
          url: encodeURIComponent(url),
        },
        { nx: true },
      );
      const createdAt = new Date(created_at).toISOString();
      const tagId = tagsToId ? tagsToId[tags[0]] : null;
      const linkDetails = {
        projectId,
        userId,
        domain,
        key,
        url,
        title,
        archived,
        createdAt,
        ...(tagId ? { tagId } : {}),
      };

      return [
        linkDetails,
        // if link has custom bitlinks, add them to the list of links to import
        ...(custom_bitlinks
          ?.filter((customBitlink: string) => {
            const customDomain = new URL(customBitlink).hostname;
            // only import custom bitlinks that have the same domain as the domains
            // that were previously imported into the project from bitly
            return domains.includes(customDomain);
          })
          .map((customBitlink: string) => {
            // here we are getting the customDomain again just in case
            // the custom bitlink doesn't have the same domain as the
            // original bitlink, but it should
            const customDomain = new URL(customBitlink).hostname;
            const customKey = new URL(customBitlink).pathname.slice(1);
            pipeline.set(
              `${customDomain}:${customKey}`,
              {
                url: encodeURIComponent(url),
              },
              { nx: true },
            );
            return {
              ...linkDetails,
              domain: customDomain,
              key: customKey,
            };
          }) ?? []),
      ];
    },
  );

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
    nextSearchAfter,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (nextSearchAfter === "") {
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
            domain: {
              in: domains,
            },
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
      redis.del(`import:bitly:${projectId}`),
      redis.del(`import:bitly:${projectId}:tags`),

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
        subject: `Your Bitly links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "Bitly",
          count,
          links,
          domains,
          projectName: project?.name ?? "",
          projectSlug: project?.slug ?? "",
        }),
      }),
    ]);
    return count;
  } else {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/bitly`,
      body: {
        projectId,
        userId,
        bitlyGroup,
        domains,
        importTags: tagsToId ? true : false,
        searchAfter: nextSearchAfter,
        count,
      },
    });
  }
};
