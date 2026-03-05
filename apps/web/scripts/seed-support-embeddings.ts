/**
 * Seed script for support embeddings.
 *
 *
 * Usage:
 *   pnpm tsx scripts/seed-support-embeddings.ts              # seed all articles
 *   pnpm tsx scripts/seed-support-embeddings.ts --url <url>  # re-seed a single article
 */

import { fetchPlausiblePageviews } from "app/api/ai/sync-embeddings/fetch-plausible-pageviews";
import "dotenv-flow/config";
import { upsertDocsEmbeddings } from "../lib/ai/upsert-docs-embedding";

/**
 * Fetch all article URLs from dub.co/llms.txt.
 */
export async function fetchArticleUrls(): Promise<string[]> {
  const res = await fetch("https://dub.co/docs/llms.txt");
  if (!res.ok) throw new Error(`Failed to fetch llms.txt: ${res.status}`);

  const text = await res.text();
  const urls: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const linkMatch = trimmed.match(
      /\(?(https?:\/\/dub\.co\/(?:docs|help)[^\s)]*)\)?/,
    );
    const candidate = linkMatch ? linkMatch[1] : trimmed;

    if (candidate.startsWith("http")) {
      try {
        const parsed = new URL(candidate);
        const origin = "https://dub.co";
        const pathname = parsed.pathname.endsWith(".md")
          ? parsed.pathname.slice(0, -3)
          : parsed.pathname;
        const normalizedUrl = `${origin}${pathname}`;
        urls.push(normalizedUrl);
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return [...new Set(urls)];
}

async function main() {
  const args = process.argv.slice(2);
  const urlFlagIdx = args.indexOf("--url");

  if (urlFlagIdx !== -1) {
    const url = args[urlFlagIdx + 1];
    if (!url) {
      console.error(
        "Error: --url requires a value (e.g. --url https://dub.co/docs/...)",
      );
      process.exit(1);
    }
    console.log(`Seeding single article: ${url}`);
    const pageviewsMap = await fetchPlausiblePageviews();
    const result = await upsertDocsEmbeddings(url, pageviewsMap);
    console.log(
      `  → ${result.chunks} chunks${result.skipped ? " (skipped)" : ""}`,
    );
    console.log("Done.");
    return;
  }

  console.log("Fetching article list from llms.txt...");
  const urls = await fetchArticleUrls();
  console.log(`Found ${urls.length} articles to embed.\n`);

  console.log("Fetching pageviews from Plausible...");
  const pageviewsMap = await fetchPlausiblePageviews();
  console.log(`Loaded pageviews for ${pageviewsMap.size} pages.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      process.stdout.write(`Processing: ${url} ... `);
      const result = await upsertDocsEmbeddings(url, pageviewsMap);
      if (result.skipped) {
        process.stdout.write(`skipped\n`);
        skipped++;
      } else {
        process.stdout.write(`${result.chunks} chunks\n`);
        success++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err}\n`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `\nDone. Success: ${success}, Skipped: ${skipped}, Failed: ${failed}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
