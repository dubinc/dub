import { headers } from "next/headers";
import { getDomain } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { allChangelogPosts } from "contentlayer/generated";

export default async function Sitemap() {
  const domain = getDomain(headers());

  // Get top 100 links (sorted by clicks in descending order)
  const links = await prisma.link.findMany({
    where: {
      domain: domain,
      publicStats: true,
    },
    select: {
      domain: true,
      key: true,
    },
    orderBy: {
      clicks: "desc",
    },
    take: 100,
  });

  return [
    {
      url: `https://${domain}`,
      lastModified: new Date(),
    },
    ...(domain === "dub.sh"
      ? [
          {
            url: `https://${domain}/changelog`,
            lastModified: new Date(),
          },
          ...allChangelogPosts.map((post) => ({
            url: `https://${domain}/changelog/${post.slug}`,
            lastModified: new Date(),
          })),
          {
            url: `https://${domain}/metatags`,
            lastModified: new Date(),
          },
        ]
      : []),
    ...links.map(({ key }) => ({
      url: `https://${domain}/stats/${key}`,
      lastModified: new Date(),
    })),
  ];
}
