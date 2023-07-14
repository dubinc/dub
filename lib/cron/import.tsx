import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";
import { sendEmail } from "emails";

// recursive function to check if pagination.searchAfter is not an empty string, else break
// rate limit for /groups/{group_guid}/bitlinks is 1500 per hour or 150 per minute
export const importLinksFromBitly = async ({
  projectId,
  bitlyGroup,
  domains,
  tagsToId,
  bitlyApiKey,
  searchAfter = null,
  count = 0,
}: {
  projectId: string;
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

  //   const pipeline = redis.pipeline();

  // convert links to format that can be imported into database
  const importedLinks = links
    .map((link) => {
      const { id, long_url: url, title, archived, created_at, tags } = link;
      const [domain, key] = id.split("/");
      // if domain is not in project domains, skip (could be a bit.ly link or old short domain)
      if (!domains.includes(domain)) {
        return null;
      }
      //   pipeline.set(
      //     `${domain}:${key}`,
      //     {
      //       url: encodeURIComponent(url),
      //     },
      //   );
      const createdAt = new Date(created_at).toISOString();
      const tagId = tagsToId ? tagsToId[tags[0]] : null;
      return {
        projectId,
        domain,
        key,
        url,
        title,
        archived,
        createdAt,
        ...(tagId ? { tagId } : {}),
      };
    })
    .filter((link) => link !== null);

  // import links into database
  await Promise.all([
    prisma.link.createMany({
      data: importedLinks,
      skipDuplicates: true,
    }),
    // pipeline.exec(),
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
    await Promise.all([
      // delete key from redis
      redis.del(`import:bitly:${projectId}`),

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
      // sendEmail({
      //     subject: `Your Bitly links have been imported!`,
      //     email: user
      // })
    ]);
    return count;
  } else {
    return await importLinksFromBitly({
      projectId,
      domains,
      bitlyGroup,
      bitlyApiKey,
      searchAfter: nextSearchAfter,
      count,
    });
  }
};
