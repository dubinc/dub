import prisma from "#/lib/prisma";
import { headers } from "next/headers";
import {
  allBlogPosts,
  allChangelogPosts,
  allHelpPosts,
  allLegalPosts,
} from "contentlayer/generated";
import { isHomeHostname, allTools } from "#/lib/constants";
import { BLOG_CATEGORIES, HELP_CATEGORIES } from "#/lib/constants/content";

export default async function Sitemap() {
  const headersList = headers();
  let domain = headersList.get("host") as string;
  if (isHomeHostname(domain)) domain = "dub.co";

  const links = await prisma.link.findMany({
    where: {
      domain: domain === "dub.co" ? "dub.sh" : domain,
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
    ...(domain === "dub.co"
      ? [
          {
            url: `https://${domain}/pricing`,
            lastModified: new Date(),
          },
          {
            url: `https://${domain}/blog`,
            lastModified: new Date(),
          },
          ...allBlogPosts.map((post) => ({
            url: `https://${domain}/blog/${post.slug}`,
            lastModified: new Date(post.publishedAt),
          })),
          ...BLOG_CATEGORIES.map((category) => ({
            url: `https://${domain}/blog/category/${category.slug}`,
            lastModified: new Date(),
          })),
          {
            url: `https://${domain}/help`,
            lastModified: new Date(),
          },
          ...allHelpPosts.map((post) => ({
            url: `https://${domain}/help/article/${post.slug}`,
            lastModified: new Date(post.updatedAt),
          })),
          ...HELP_CATEGORIES.map((category) => ({
            url: `https://${domain}/help/category/${category.slug}`,
            lastModified: new Date(),
          })),
          {
            url: `https://${domain}/changelog`,
            lastModified: new Date(),
          },
          ...allChangelogPosts.map((post) => ({
            url: `https://${domain}/changelog/${post.slug}`,
            lastModified: new Date(post.publishedAt),
          })),
          ...allTools.map((tool) => ({
            url: `https://${domain}/tools/${tool}`,
            lastModified: new Date(),
          })),
          ...allLegalPosts.map((post) => ({
            url: `https://${domain}/${post.slug}`,
            lastModified: new Date(post.updatedAt),
          })),
        ]
      : []),
    ...links.map(({ key }) => ({
      url: `https://${domain}/stats/${key}`,
      lastModified: new Date(),
    })),
  ];
}
