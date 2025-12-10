import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
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

async function main() {
  const programToAdd = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "",
      groups: {
        some: {
          slug: DEFAULT_PARTNER_GROUP.slug,
          applicationFormPublishedAt: {
            not: null,
          },
        },
      },
    },
  });

  if (!programToAdd.url) {
    throw new Error("Program URL is not set");
  }

  const scraped = await scrapeWebsite(programToAdd.url);

  const res = await prisma.program.update({
    where: {
      id: programToAdd.id,
    },
    data: {
      addedToMarketplaceAt: new Date(),
      description: scraped?.description || null,
    },
  });

  console.log(
    `Added ${res.name} to the marketplace with description: ${res.description}`,
  );
}

main();
