import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import FireCrawlApp from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import "dotenv-flow/config";
import { z } from "zod";

const CategoryEnum = z.nativeEnum(Category);

// AI response schema
const categorizationSchema = z.object({
  categories: z.array(CategoryEnum).min(1).max(3),
  reasoning: z.string(),
});

// Result interface
interface ProgramResult {
  programId: string;
  programName: string;
  categories: Category[];
  url?: string;
  error?: string;
}

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

// Function to categorize content using AI
async function categorizeProgram(
  programName: string,
  url: string,
  content: string,
  title: string,
  description: string,
) {
  try {
    const prompt = `Analyze this website and categorize it into 1-3 most relevant categories.

IMPORTANT: You must select categories from this EXACT list (case-sensitive):
- Artificial_Intelligence
- Development
- Design
- Productivity
- Finance
- Marketing
- Ecommerce
- Security
- Education
- Health
- Consumer

Category descriptions:
- Artificial_Intelligence: AI/ML tools, chatbots, automation, machine learning platforms
- Development: Code tools, APIs, developer platforms, programming resources
- Design: Design tools, UI/UX, creative software, graphics
- Productivity: Task management, collaboration, workflow tools, organization
- Finance: Financial services, payments, accounting, investment, banking
- Marketing: Marketing tools, analytics, advertising, social media, SEO
- Ecommerce: Online stores, commerce platforms, marketplaces, retail
- Security: Cybersecurity, privacy, protection tools, data security
- Education: Learning platforms, courses, educational content, training
- Health: Healthcare, fitness, wellness apps, medical services
- Consumer: General consumer products/services that don't fit other categories

CRITICAL: Only use the exact category names listed above. DO NOT create new categories or modify existing ones. Do not select "Entrepreneurship" or "Business" as a category.

Website information:
Name: ${programName}
Website URL: ${url}
Page Title: ${title}
Meta Description: ${description}
Website Content Preview: ${content.slice(0, 300)}...`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: categorizationSchema,
      prompt,
    });

    return object.categories;
  } catch (error) {
    // console.error(`Error categorizing ${programName}:`, error);

    // If it's a validation error (invalid enum values), return empty array
    if (
      error?.name === "AI_NoObjectGeneratedError" ||
      error?.cause?.name === "AI_TypeValidationError"
    ) {
      console.log(
        `  Invalid categories returned for ${programName}, skipping categorization`,
      );
      return []; // Return empty array for invalid categories
    }

    return []; // Return empty array for any other errors too
  }
}

// Main processing function
async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "",
      url: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      url: true,
    },
  });

  // Scrape website
  console.log(`Scraping: ${program.url}...`);

  const scraped = await scrapeWebsite(program.url!); // already filtered above

  if (!scraped) {
    throw new Error("Failed to scrape website");
  }

  console.log(`Description: ${scraped.description}`);

  // Categorize with AI
  console.log(`Analyzing content...`);
  const categories = await categorizeProgram(
    program.name,
    program.url!, // already filtered above
    scraped.content,
    scraped.title,
    scraped.description,
  );

  console.log(
    `Categories: ${categories.length > 0 ? categories.join(", ") : "None (invalid/failed categorization)"}`,
  );

  const res = await prisma.program.update({
    where: { id: program.id },
    data: {
      addedToMarketplaceAt: new Date(),
      description: scraped.description,
      categories: {
        deleteMany: {},
        create: categories.map((category) => ({ category })),
      },
    },
  });

  console.log(
    `Added ${res.name} to the marketplace with description: ${res.description}`,
  );
}

main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
