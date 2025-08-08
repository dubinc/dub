"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import {
  programLanderSchema,
  programLanderSimpleSchema,
} from "@/lib/zod/schemas/program-lander";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@dub/prisma";
import FireCrawlApp, {
  ErrorResponse,
  ScrapeResponse,
} from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  websiteUrl: z.string().url(),
  landerData: programLanderSchema.optional(),
  prompt: z.string().optional(),
});

export const generateLanderAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { websiteUrl, landerData, prompt } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        rewards: true,
        discounts: true,
      },
    });

    const { rewards, discount } =
      getProgramApplicationRewardsAndDiscount(program);

    const firecrawl = new FireCrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const scrapeResult = await firecrawl.scrapeUrl(websiteUrl, {
      formats: ["markdown", "links"],
      onlyMainContent: false,
      parsePDF: false,
      maxAge: 14400000,
    });

    if (!scrapeResult.success) throw new Error(scrapeResult.error);

    let pricingScrapeResult: ScrapeResponse | ErrorResponse | null = null;
    const pricingLink = scrapeResult.links?.find((link) =>
      link.endsWith("/pricing"),
    );
    if (pricingLink)
      pricingScrapeResult = await firecrawl.scrapeUrl(pricingLink, {
        formats: ["markdown"],
        onlyMainContent: true,
        parsePDF: false,
        maxAge: 14400000,
      });

    const mainPageMarkdown = cleanMarkdown(scrapeResult.markdown || "");
    const pricingPageMarkdown = pricingScrapeResult?.success
      ? cleanMarkdown(pricingScrapeResult.markdown || "")
      : null;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: landerData ? programLanderSchema : programLanderSimpleSchema,
      prompt:
        // Instructions
        `Generate a basic landing page for an affiliate program powered by Dub Partners based on a company website. ` +
        `For context, Dub Partners is a next-gen affiliate management platform with 1-click global payouts + white-labeling functionality. ` +
        `Do not include any initial header/hero content because the landing page will already have an initial title and subtitle. ` +
        `Do not make any assumptions about the terms or rewards associated with the program. ` +
        (scrapeResult.metadata?.ogImage
          ? `You ${landerData ? "could" : "may"} include an image block in the landing page, only using the OG image here: ${scrapeResult.metadata?.ogImage}. `
          : "") +
        `Do not add any file blocks. ` +
        `If you have product pricing information, ${landerData ? "you could" : "you should"} include an earnings calculator block, using the highest non-enterprise tier for the product price. ` +
        `Markdown is supported in "text" blocks, but use it sparingly. ` +
        `Avoid using links. Relevant CTA links are already on the landing page. ` +
        // Additional instructions
        (prompt
          ? `\n\nAdditional instructions are provided by the user. If they specify a specific action, do not do anything more than that action: "${prompt}"`
          : "") +
        // Program details
        `\n\nProgram details:` +
        `\n\nName: ${program.name}\n` +
        `\nAffiliate rewards: ${rewards.map((reward) => formatRewardDescription({ reward })).join(", ")}` +
        (discount
          ? `\nDiscounts for referred users: ${formatDiscountDescription({ discount })}`
          : "") +
        // Existing page
        (landerData
          ? `\n\nThis landing page already has existing content. DO NOT update the existing content, only add new content (unless otherwise directed). ` +
            `Absolutely do not update file or image blocks, just maintain them. Existing content:` +
            `\n${JSON.stringify(landerData, null, 2)}`
          : "") +
        // Website content
        `\n\nCompany website to base the landing page on:\n\n${mainPageMarkdown}` +
        (pricingPageMarkdown
          ? `\n\nCompany pricing page:\n\n${pricingPageMarkdown}`
          : ""),
      temperature: 0.4,
    });

    return programLanderSchema.parse(object);
  });

function cleanMarkdown(markdown: string) {
  // Remove images
  markdown = markdown.replaceAll(/!\[[^\]]+\]\([^\)]+\)/g, "");

  // Truncate to 10k characters
  markdown = markdown.substring(0, 10_000);

  return markdown;
}
