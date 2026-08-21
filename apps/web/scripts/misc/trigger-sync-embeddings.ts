import "dotenv-flow/config";

import { qstash } from "@/lib/cron";
import { crawlSitemapUrls } from "@/lib/sitemaps/import-tracked-sitemaps";

const DOCS_SITEMAP_URL = "https://dub.co/docs/sitemap.xml";
const FLOW_CONTROL_KEY = "sync-docs-embeddings";

// script to trigger a sync of all docs/help articles
async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is not set");
  }

  console.log(`Fetching sitemap from ${DOCS_SITEMAP_URL}...`);
  const { urls, hadErrors } = await crawlSitemapUrls(DOCS_SITEMAP_URL);

  if (hadErrors) {
    throw new Error(`Failed to fetch sitemap ${DOCS_SITEMAP_URL}`);
  }

  console.log(`Found ${urls.length} URLs to sync`);

  for (const url of urls) {
    const normalizedUrl = new URL(url).toString();

    const response = await qstash.publishJSON({
      url: "https://app.dub.co/api/ai/sync-embeddings",
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: { url: normalizedUrl },
      flowControl: {
        key: FLOW_CONTROL_KEY,
        rate: 1,
      },
    });

    console.log(
      `Queued sync for ${normalizedUrl} (messageId: ${response.messageId})`,
    );
  }

  console.log(`Queued ${urls.length} embedding sync jobs`);
}

main();
