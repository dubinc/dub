import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { XMLParser } from "fast-xml-parser";
import { bulkCreateLinks } from "../lib/api/links";

async function fetchSitemap(url: string) {
  const response = await fetch(url);
  const xml = await response.text();
  const parser = new XMLParser();
  const result = parser.parse(xml);
  return result.urlset.url.map((entry: { loc: string }) => entry.loc);
}

const sitemapUrl = "https://dub.co/sitemap.xml";
const domain = "site.dub.co";
const projectId = "xxx";
const userId = "xxx";
const folderId = "xxx";

async function main() {
  // Fetch and parse sitemap
  const sitemapUrls = await fetchSitemap(sitemapUrl);

  // Filter out homepage and invalid URLs
  const validUrls = sitemapUrls
    .map((url: string) => {
      const urlObj = new URL(url);
      let key = urlObj.pathname.slice(1);
      if (key === "") {
        key = "_root";
      }
      return {
        id: createId({ prefix: "link_" }),
        domain,
        key,
        url,
        trackConversion: true,
        projectId,
        userId,
        folderId,
      };
    })
    .slice(0, 1000);

  const existingLinks = await prisma.link.findMany({
    where: {
      domain,
      key: {
        in: validUrls.map((link) => link.key),
      },
    },
  });

  const linksToCreate = validUrls.filter(
    (link) => !existingLinks.some((l) => l.key === link.key),
  );

  console.table(linksToCreate);
  console.log(`Found ${linksToCreate.length} links to create`);

  const res = await bulkCreateLinks({
    links: linksToCreate,
    skipRedisCache: true,
  });
  console.log(`Created ${res.length} links`);
}

main().catch(console.error);
