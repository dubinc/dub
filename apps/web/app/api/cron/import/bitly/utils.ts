import { bulkCreateLinks } from "@/lib/api/links";
import { redis } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import { LinksImported } from "@dub/email/templates/links-imported";
import { prisma } from "@dub/prisma";
import { getUrlFromStringIfValid, linkConstructorSimple } from "@dub/utils";
import { fetchBitlyLinks } from "./fetch-utils";
import { queueBitlyImport } from "./queue-import";

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
  createdBefore = null,
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
  createdBefore?: string | null;
  count?: number;
}) => {
  // Fetch links from Bitly (either standard or batch method based on bitlyGroup)
  const { links, nextSearchAfter, rateLimited, batchStats } =
    await fetchBitlyLinks({
      bitlyGroup,
      bitlyApiKey,
      searchAfter,
      createdBefore,
    });

  // If rate limited, queue for later
  if (rateLimited) {
    return await queueBitlyImport({
      workspaceId,
      userId,
      bitlyGroup,
      domains,
      folderId,
      tagsToId,
      searchAfter,
      count,
      rateLimited: true,
    });
  }

  // If no links were returned, exit early
  if (!links || links.length === 0) {
    console.log("No links returned from Bitly");
    return count;
  }

  const invalidLinks: any[] = [];

  // convert links to format that can be imported into database
  const importedLinks = links.flatMap(
    ({ id, long_url: url, archived, created_at, custom_bitlinks, tags }) => {
      if (!id || !url) {
        return [];
      }
      const [domain, key] = id.split("/");
      // if domain is not in workspace domains, skip (could be a bit.ly link or old short domain)
      if (!domains.includes(domain)) {
        invalidLinks.push({
          id,
          url,
        });
        return [];
      }

      const sanitizedUrl = getUrlFromStringIfValid(url);
      // skip if url is not valid
      if (!sanitizedUrl) {
        invalidLinks.push({
          id,
          url,
        });
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

  console.log(`Creating ${importedLinks.length} new links...`);

  // bulk create links
  await bulkCreateLinks({ links: importedLinks, skipRedisCache: true });

  count += importedLinks.length;

  // Log batch stats if available
  console.log({
    importedLinksLength: importedLinks.length,
    count,
    nextSearchAfter,
    ...(batchStats && { batchStats }),
  });

  console.log(`Invalid links: ${invalidLinks.length}`);
  console.log(JSON.stringify(invalidLinks, null, 2));

  const finalImportedLink = importedLinks[importedLinks.length - 1];
  console.log(
    `Successfully imported ${importedLinks.length} new links! Final imported link: ${finalImportedLink?.shortLink} (${finalImportedLink ? new Date(finalImportedLink.createdAt).toISOString() : "none"})`,
  );

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
        // only include links if less than 10,000 links have been imported
        ...(count < 10_000 && {
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
        }),
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
      searchAfter: nextSearchAfter,
      count,
    });
  }
};
