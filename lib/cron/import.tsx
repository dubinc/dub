import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";
import { randomBadgeColor } from "@/components/app/links/tag-badge";

// recursive function to check if pagination.searchAfter is not an empty string, else break
// rate limit for /groups/{group_guid}/bitlinks is 1500 per hour or 150 per minute
export const importLinksFromBitly = async ({
  projectId,
  projectDomains,
  bitlyGroup,
  bitlyApiKey,
  preserveTags,
  searchAfter = null,
  count = 0,
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
  const importedLinks = links
    .map((link) => {
      const { id, long_url: url, title, archived, tags } = link;
      const [domain, key] = id.split("/");
      // if domain is not in project domains, skip (could be a bit.ly link or old short domain)
      if (!projectDomains.includes(domain)) {
        return null;
      }
      pipeline.set(
        `${domain}:${key}`,
        {
          url: encodeURIComponent(url),
        },
        {
          nx: true,
        },
      );
      const tag = tags[0];
      return {
        projectId,
        domain,
        key,
        url,
        title,
        archived,
        // if we're preserving tags, connect or create the first tag
        ...(preserveTags && {
          tag: {
            connectOrCreate: {
              where: {
                name_projectId: {
                  name: tag,
                  projectId,
                },
              },
              create: {
                name: tag,
                color: randomBadgeColor(),
                projectId,
              },
            },
          },
        }),
      };
    })
    .filter((link) => link !== null);

  // import links into database
  // await Promise.all([
  //   prisma.link.createMany({
  //     data: importedLinks,
  //     skipDuplicates: true,
  //   }),
  //   pipeline.exec(),
  // ]);

  count += importedLinks.length;

  console.log({
    importedLinksLength: importedLinks.length,
    count,
    nextSearchAfter,
  });

  // wait 500 ms before making another request
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (nextSearchAfter === "") {
    return count;
  } else {
    return await importLinksFromBitly({
      projectId,
      projectDomains,
      bitlyGroup,
      bitlyApiKey,
      preserveTags,
      searchAfter: nextSearchAfter,
      count,
    });
  }
};
