import "dotenv-flow/config";
import { XMLParser } from "fast-xml-parser";
import { dub } from "../lib/dub";

async function fetchSitemap(url: string) {
  const response = await fetch(url);
  const xml = await response.text();
  const parser = new XMLParser();
  const result = parser.parse(xml);
  return result.urlset.url.map((entry: { loc: string }) => entry.loc);
}

async function main() {
  // Fetch and parse sitemap
  const sitemapUrls = await fetchSitemap("https://dub.co/sitemap.xml");

  // Filter out homepage and invalid URLs
  const validUrls = sitemapUrls
    .filter((url: string) => url !== "https://dub.co")
    .map((url: string) => {
      const urlObj = new URL(url);
      return {
        domain: "site.dub.co",
        key: urlObj.pathname.slice(1),
        url,
        trackConversion: true,
        folderId: "fold_fjA8lslBy2qFcosUrwWFxmfk",
      };
    })
    .slice(200, 300);

  console.log(`Found ${validUrls.length} valid URLs to process`);
  //   console.log(validUrls);

  await dub.links.createMany(validUrls);
}

main().catch(console.error);
