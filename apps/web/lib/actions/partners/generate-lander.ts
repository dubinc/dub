"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { programLanderSimpleSchema } from "@/lib/zod/schemas/program-lander";
import { anthropic } from "@ai-sdk/anthropic";
import FireCrawlApp from "@mendable/firecrawl-js";
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
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const app = new FireCrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

    const scrapeResult = await app.scrapeUrl(websiteUrl, {
      formats: ["markdown", "links"],
      onlyMainContent: false,
      parsePDF: false,
      maxAge: 14400000,
    });

    if (!scrapeResult.success) throw new Error(scrapeResult.error);

    const { object } = await generateObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: programLanderSimpleSchema,
      prompt:
        `Generate a basic landing page for an affiliate program based on the following company website. ` +
        `Do not include any initial header/hero content because the landing page will already have an initial title and subtitle. ` +
        `Do not make any assumptions about the terms or rewards associated with the program. ` +
        `Markdown is supported in "text" blocks, but use it sparingly. ` +
        `Company website:\n\n${scrapeResult.markdown}`,
      temperature: 0.4,
    });

    return object;
  });
