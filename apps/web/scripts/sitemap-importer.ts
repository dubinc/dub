import { createId } from "@/lib/api/create-id";
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

async function main() {
  // Fetch and parse sitemap
  const sitemapUrls = await fetchSitemap("https://domain.com/sitemap.xml");

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
        domain: "site.domain.com",
        key,
        url,
        trackConversion: true,
        projectId: "xxx",
        userId: "xxx",
        folderId: "xxx",
      };
    })
    .slice(0, 1000);

  console.table(validUrls);
  console.log(`Found ${validUrls.length} valid URLs to process`);

  const res = await bulkCreateLinks({
    links: validUrls,
    skipRedisCache: true,
  });
  console.log(`Created ${res.length} links`);
}

main().catch(console.error);
