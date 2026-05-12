import { anthropic } from "@ai-sdk/anthropic";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import FireCrawlApp from "@mendable/firecrawl-js";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const addProgramSchema = z.object({
  programSlug: z.string().trim().min(1),
});

const CategoryEnum = z.enum(Category);
const categorizationSchema = z.object({
  categories: z.array(CategoryEnum).min(1).max(3),
  reasoning: z.string(),
});

async function scrapeWebsite(url: string, firecrawl: FireCrawlApp) {
  const scrapeResult = await firecrawl.scrapeUrl(url, {
    formats: ["markdown"],
    onlyMainContent: true,
    parsePDF: false,
    maxAge: 14400000,
    excludeTags: ["img"],
  });

  if (!scrapeResult.success) {
    throw new Error(scrapeResult.error || "Failed to scrape website");
  }

  return {
    content: scrapeResult.markdown || "",
    title: scrapeResult.metadata?.title || "",
    description: scrapeResult.metadata?.description || "",
  };
}

async function categorizeProgram({
  programName,
  url,
  content,
  title,
  description,
}: {
  programName: string;
  url: string;
  content: string;
  title: string;
  description: string;
}) {
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
- Support

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
- Support: Support tools, help desks, customer support, troubleshooting, customer service

Website information:
Name: ${programName}
Website URL: ${url}
Page Title: ${title}
Meta Description: ${description}
Website Content Preview: ${content.slice(0, 300)}...`;

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    output: Output.object({
      schema: categorizationSchema,
    }),
    prompt,
  });

  return categorizationSchema.parse(output).categories;
}

// GET /api/admin/programs
export const GET = withAdmin(async () => {
  const programs = await prisma.program.findMany({
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
    },
    orderBy: [{ marketplaceRanking: "asc" }, { addedToMarketplaceAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      url: true,
      description: true,
      addedToMarketplaceAt: true,
      marketplaceRanking: true,
      categories: {
        select: {
          category: true,
        },
      },
    },
  });

  return NextResponse.json({
    programs: programs.map(({ categories, ...program }) => ({
      ...program,
      categories: categories.map(({ category }) => category),
    })),
  });
});

// POST /api/admin/programs
export const POST = withAdmin(
  async ({ req }) => {
    const { programSlug } = addProgramSchema.parse(await req.json());

    if (!process.env.FIRECRAWL_API_KEY) {
      return new Response("FIRECRAWL_API_KEY is not set.", { status: 500 });
    }

    const program = await prisma.program.findUnique({
      where: {
        slug: programSlug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        url: true,
      },
    });

    if (!program) {
      return new Response("Program not found.", { status: 404 });
    }

    if (!program.url) {
      return new Response("Program must have a URL before listing.", {
        status: 400,
      });
    }

    const firecrawl = new FireCrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const scraped = await scrapeWebsite(program.url, firecrawl);
    const categories = await categorizeProgram({
      programName: program.name,
      url: program.url,
      content: scraped.content,
      title: scraped.title,
      description: scraped.description,
    }).catch(() => [] as Category[]);

    const updatedProgram = await prisma.program.update({
      where: {
        id: program.id,
      },
      data: {
        addedToMarketplaceAt: new Date(),
        description: scraped.description || null,
        categories: {
          deleteMany: {},
          create: categories.map((category) => ({ category })),
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    return NextResponse.json(updatedProgram);
  },
  {
    requiredRoles: ["owner"],
  },
);

const reorderProgramsSchema = z.object({
  updates: z
    .array(
      z.object({
        programId: z.string().trim().min(1),
        marketplaceRanking: z.number().int().positive(),
      }),
    )
    .min(1),
});

// PATCH /api/admin/programs
export const PATCH = withAdmin(
  async ({ req }) => {
    const { updates } = reorderProgramsSchema.parse(await req.json());
    const uniqueUpdates = [
      ...new Map(updates.map((update) => [update.programId, update])).values(),
    ];

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: uniqueUpdates.map(({ programId }) => programId),
        },
        addedToMarketplaceAt: {
          not: null,
        },
      },
      select: {
        id: true,
        marketplaceRanking: true,
      },
    });

    const programById = new Map(
      programs.map((program) => [program.id, program]),
    );
    const updatesToApply = uniqueUpdates.filter(({ programId }) =>
      programById.has(programId),
    );

    await prisma.$transaction(
      updatesToApply.map(({ programId, marketplaceRanking }) =>
        prisma.program.update({
          where: {
            id: programId,
          },
          data: {
            marketplaceRanking,
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      updated: updatesToApply.length,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
