"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { anthropic } from "@ai-sdk/anthropic";
import FireCrawlApp, {
  ErrorResponse,
  ScrapeResponse,
} from "@mendable/firecrawl-js";
import { generateObject } from "ai";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  websiteUrl: z.string().url(),
});

export const generateLanderAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { websiteUrl } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const program = await getProgramOrThrow(
      {
        workspaceId: workspace.id,
        programId,
      },
      {
        includeDefaultRewards: true,
        includeDefaultDiscount: true,
      },
    );

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
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: programLanderSimpleSchema,
      prompt:
        // Instructions
        `Generate a basic landing page for an affiliate program powered by Dub Partners based on a company website. ` +
        `Do not include any initial header/hero content because the landing page will already have an initial title and subtitle. ` +
        `Do not make any assumptions about the terms or rewards associated with the program. ` +
        `Markdown is supported in "text" blocks, but use it sparingly. ` +
        `Avoid using links. Relevant CTA links are already on the landing page. ` +
        // Program details
        `\n\nProgram details:` +
        `\n\nName: ${program.name}\n` +
        `\nAffiliate rewards: ${program.rewards?.map((reward) => formatRewardDescription({ reward })) || "Unknown"}` +
        (program.discounts?.length
          ? `\nDiscounts for referred users: ${formatDiscountDescription({ discount: program.discounts[0] })}`
          : "") +
        // Dub Partners
        `\n\nMore about Dub Partners:\n\n` +
        `Dub Partners enables businesses to create scalable referral and affiliate programs to drive revenue through incentivized user and partner networks. ` +
        `With Dub Partners, you can build powerful, scalable referral and affiliate programs with 1-click global payouts and white-labeling functionality. ` +
        // Website content
        `\n\nCompany website to base the landing page on:\n\n${mainPageMarkdown}` +
        (pricingPageMarkdown
          ? `\n\nCompany pricing page:\n\n${pricingPageMarkdown}`
          : ""),
      temperature: 0.4,
    });

    return object;
  });

function cleanMarkdown(markdown: string) {
  // Remove images
  return markdown.replaceAll(/!\[[^\]]+\]\([^\)]+\)/g, "");
}
