/**
 * Seed script for support embeddings.
 *
 *
 * Usage:
 *   pnpm tsx scripts/seed-support-embeddings.ts              # seed all articles
 *   pnpm tsx scripts/seed-support-embeddings.ts --url <url>  # re-seed a single article
 */

import { fetchArticleUrls, seedArticle } from "@/lib/ai/seed-article";

async function main() {
  const args = process.argv.slice(2);
  const urlFlagIdx = args.indexOf("--url");

  if (urlFlagIdx !== -1 && args[urlFlagIdx + 1]) {
    const url = args[urlFlagIdx + 1];
    console.log(`Seeding single article: ${url}`);
    const result = await seedArticle(url);
    console.log(`  → ${result.chunks} chunks${result.skipped ? " (skipped)" : ""}`);
    console.log("Done.");
    return;
  }

  console.log("Fetching article list from llms.txt...");
  const urls = await fetchArticleUrls();
  console.log(`Found ${urls.length} articles to embed.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      process.stdout.write(`Processing: ${url} ... `);
      const result = await seedArticle(url);
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
