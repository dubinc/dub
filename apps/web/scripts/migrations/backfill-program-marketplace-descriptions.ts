import { prisma } from "@dub/prisma";
import FireCrawlApp from "@mendable/firecrawl-js";
import "dotenv-flow/config";

if (!process.env.FIRECRAWL_API_KEY)
  throw new Error("FIRECRAWL_API_KEY is not set");

// Initialize FireCrawl
const firecrawl = new FireCrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

// Function to scrape website content
async function scrapeWebsite(url: string) {
  try {
    const scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      parsePDF: false,
      maxAge: 14400000, // 4 hours cache
      excludeTags: ["img"],
    });

    if (!scrapeResult.success) {
      throw new Error(scrapeResult.error || "Failed to scrape");
    }

    return {
      content: scrapeResult.markdown || "",
      title: scrapeResult.metadata?.title || "",
      description: scrapeResult.metadata?.description || "",
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Main processing function
async function main() {
  console.log("Starting program description backfill...");

  const programs = await prisma.program.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      description: true,
    },
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
      url: {
        not: null,
      },
      description: null,
    },
  });

  console.log(`Found ${programs.length} programs to backfill descriptions`);

  let successCount = 0;
  let errorCount = 0;

  // Process each program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    console.log(`\n[${i + 1}/${programs.length}] Processing: ${program.name}`);

    if (!program.url) {
      console.log(`  Skipping: No URL provided`);
      errorCount++;
      continue;
    }

    // Scrape website
    console.log(`  Scraping: ${program.url}`);
    const scraped = await scrapeWebsite(program.url);

    if (!scraped) {
      console.log(`  Error: Failed to scrape website`);
      errorCount++;
      continue;
    }

    if (!scraped.description) {
      console.log(`  Error: Failed to generate description`);
      errorCount++;
      continue;
    }

    // Update program description
    await prisma.program.update({
      where: { id: program.id },
      data: { description: scraped.description },
    });

    console.log(
      `  ✓ Updated description: ${scraped.description.substring(0, 100)}...`,
    );
    successCount++;

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\nCompleted: ${successCount} successful, ${errorCount} errors`);
}

main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
