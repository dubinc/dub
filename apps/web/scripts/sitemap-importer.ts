import "dotenv-flow/config";
import { importTrackedSitemaps } from "../lib/sitemaps/import-tracked-sitemaps";

const sitemapUrl = "https://dub.co/sitemap.xml";
const domain = "site.dub.co";
const projectId = "ws_xxx";

async function main() {
  const { linksToCreate, createdLinks } = await importTrackedSitemaps({
    trackedSitemaps: [{ url: sitemapUrl }],
    domain,
    projectId,
  });

  console.table(linksToCreate);
  console.log(`Found ${linksToCreate.length} links to create`);
  console.log(`Created ${createdLinks.length} links`);
}

main().catch(console.error);
