import { bulkCreateLinks } from "@/lib/api/links";
import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import { LinksImported } from "@dub/email/templates/links-imported";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  getUrlFromStringIfValid,
  linkConstructorSimple,
} from "@dub/utils";

interface RateLimitResponse {
  platform_limits: {
    endpoint: string;
    methods: {
      name: string;
      limit: number;
      count: number;
    }[];
  }[];
}

// Note: rate limit for /groups/{group_guid}/bitlinks is 1500 per hour or 150 per minute
export const importLinksFromBitly = async ({
  workspaceId,
  userId,
  bitlyGroup,
  domains,
  folderId,
  tagsToId,
  bitlyApiKey,
  searchAfter = null,
  count = 0,
}: {
  workspaceId: string;
  userId: string;
  bitlyGroup: string;
  domains: string[];
  folderId?: string;
  tagsToId?: Record<string, string>;
  bitlyApiKey: string;
  searchAfter?: string | null;
  count?: number;
}) => {
  const response = await fetch(
    `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/bitlinks?size=100${
      searchAfter ? `&search_after=${searchAfter}` : ""
    }`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bitlyApiKey}`,
      },
    },
  );


  if (!response.ok && response.status === 429) {
    return await queueBitlyImport({
      workspaceId,
      userId,
      bitlyGroup,
      domains,
      folderId,
      tagsToId,
      nextSearchAfter: searchAfter,
      count,
      rateLimited: true,
    });
  }

  const data = await response.json();

  const { links, pagination } = data;
  const nextSearchAfter = pagination.search_after;

  // convert links to format that can be imported into database
  const importedLinks = links.flatMap(
    ({ id, long_url: url, archived, created_at, custom_bitlinks, tags }) => {
      if (!id || !url) {
        return [];
      }
      const [domain, key] = id.split("/");
      // if domain is not in workspace domains, skip (could be a bit.ly link or old short domain)
      if (!domains.includes(domain)) {
        return [];
      }

      const sanitizedUrl = getUrlFromStringIfValid(url);
      // skip if url is not valid
      if (!sanitizedUrl) {
        return [];
      }

      const createdAt = new Date(created_at).toISOString();
      const tagIds = tagsToId ? tags.map((tag: string) => tagsToId[tag]) : [];
      const linkDetails = {
        projectId: workspaceId,
        userId,
        domain,
        key,
        url: sanitizedUrl,
        shortLink: linkConstructorSimple({
          domain,
          key,
        }),
        archived,
        createdAt,
        tagIds,
        folderId,
      };

      return [
        linkDetails,
        // if link has custom bitlinks, add them to the list of links to import
        ...(custom_bitlinks
          ?.filter((customBitlink: string) => {
            try {
              const customDomain = new URL(customBitlink).hostname;
              // only import custom bitlinks that have the same domain as the domains
              // that were previously imported into the workspace from bitly
              return domains.includes(customDomain);
            } catch (e) {
              console.error(
                `Invalid custom bitlink, skipping: ${customBitlink}`,
              );
              return false;
            }
          })
          .map((customBitlink: string) => {
            try {
              // here we are getting the customDomain again just in case
              // the custom bitlink doesn't have the same domain as the
              // original bitlink, but it should
              const customDomain = new URL(customBitlink).hostname;
              const customKey = new URL(customBitlink).pathname.slice(1);

              // Create a copy with the new domain and key
              return {
                ...linkDetails,
                domain: customDomain,
                key: customKey,
                shortLink: linkConstructorSimple({
                  domain: customDomain,
                  key: customKey,
                }),
              };
            } catch (e) {
              console.error(
                `Error processing custom bitlink, skipping: ${customBitlink}`,
              );
              return null;
            }
          })
          .filter(Boolean) ?? []),
      ];
    },
  );

  // check if links are already in the database
  const alreadyCreatedLinks = await prisma.link.findMany({
    where: {
      shortLink: {
        in: importedLinks.map((link) => link.shortLink),
      },
    },
    select: {
      shortLink: true,
    },
  });

  // filter out links that are already in the database
  const linksToCreate = importedLinks.filter(
    (link) => !alreadyCreatedLinks.some((l) => l.shortLink === link.shortLink),
  );

  console.log(
    `Found ${alreadyCreatedLinks.length} links that have already been imported, skipping them and creating ${linksToCreate.length} new links...`,
  );
  // bulk create links
  await bulkCreateLinks({ links: linksToCreate });

  count += importedLinks.length;

  console.log({
    importedLinksLength: importedLinks.length,
    count,
    nextSearchAfter,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (nextSearchAfter === "") {
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
    const ownerEmail = workspace?.users[0].user.email ?? "";
    const links = workspace?.links ?? [];

    await Promise.all([
      // delete keys from redis
      redis.del(`import:bitly:${workspaceId}`),
      redis.del(`import:bitly:${workspaceId}:tags`),

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
        subject: `Your Bitly links have been imported!`,
        email: ownerEmail,
        react: LinksImported({
          email: ownerEmail,
          provider: "Bitly",
          count,
          links,
          domains,
          workspaceName: workspace?.name ?? "",
          workspaceSlug: workspace?.slug ?? "",
        }),
      }),
    ]);
    return count;
  } else {
    return await queueBitlyImport({
      workspaceId,
      userId,
      bitlyGroup,
      domains,
      folderId,
      tagsToId,
      nextSearchAfter,
      count,
    });
  }
};

// Queue a Bitly import
export const queueBitlyImport = async (payload: {
  workspaceId: string;
  userId: string;
  bitlyGroup: string;
  domains: string[];
  folderId?: string;
  tagsToId?: Record<string, string>;
  nextSearchAfter?: string | null;
  count?: number;
  rateLimited?: boolean;
  delay?: number;
}) => {
  const { tagsToId, nextSearchAfter, delay, ...rest } = payload;

  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/bitly`,
    body: {
      ...rest,
      importTags: tagsToId ? true : false,
      searchAfter: nextSearchAfter,
    },
    ...(delay && { delay }),
  });
};

// Handle rate limited requests
export const checkIfRateLimited = async (bitlyApiKey: unknown, body: any) => {
  const path = "/groups/{group_guid}/bitlinks";

  const response = await fetch(
    `https://api-ssl.bitly.com/v4/user/platform_limits?path=${path}`,
    {
      headers: {
        Authorization: `Bearer ${bitlyApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = (await response.json()) as RateLimitResponse;

  const endpoint = data.platform_limits[0].methods.find(
    (method) => method.name === "GET",
  )!;

  const limit = endpoint.limit;
  const currentUsage = endpoint.count;

  console.log("checkIfRateLimited", endpoint);

  const isRateLimited = limit - currentUsage === 0;

  if (isRateLimited) {
    await queueBitlyImport({
      ...body,
      rateLimited: true,
      delay: 2 * 60, // try again after 2 minutes
    });
  }

  return isRateLimited;
};
