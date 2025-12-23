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
  console.log("Starting program categorization...");

  const programs = await prisma.program.findMany({
    select: {
      id: true,
      name: true,
      url: true,
    },
    where: {
      url: {
        not: null,
      },
      categories: {
        none: {},
      },
      addedToMarketplaceAt: {
        not: null,
      },
    },
    take: 10,
  });

  console.log(`Found ${programs.length} programs to categorize`);

  const results: ProgramResult[] = [];

  // Process each program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    console.log(`\n[${i + 1}/${programs.length}] Processing: ${program.name}`);

    if (!program.url) {
      results.push({
        programId: program.id,
        programName: program.name,
        categories: [],
        error: "No URL provided",
      });
      continue;
    }

    // Scrape website
    console.log(`Scraping: ${program.url}`);
    const scraped = await scrapeWebsite(program.url);

    if (!scraped) {
      results.push({
        programId: program.id,
        programName: program.name,
        categories: [],
        url: program.url,
        error: "Failed to scrape website",
      });
      continue;
    }

    // Categorize with AI
    console.log(`Analyzing content...`);
    const categories = await categorizeProgram(
      program.name,
      program.url,
      scraped.content,
      scraped.title,
      scraped.description,
    );

    results.push({
      programId: program.id,
      programName: program.name,
      categories: categories as Category[],
      url: program.url,
    });

    console.log(
      `  Categories: ${categories.length > 0 ? categories.join(", ") : "None (invalid/failed categorization)"}`,
    );

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(JSON.stringify(results, null, 2));
  console.log(`Completed categorization of ${results.length} programs`);

  const expanded = results.flatMap((result) =>
    result.categories.map((category) => ({
      programId: result.programId,
      category,
    })),
  );

  console.log("expanded", JSON.stringify(expanded, null, 2));

  if (!expanded.length) return;

  await prisma.programCategory.createMany({
    data: expanded,
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
