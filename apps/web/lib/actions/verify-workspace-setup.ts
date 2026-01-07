"use server";

import { prisma } from "@dub/prisma";
import FirecrawlApp from "@mendable/firecrawl-js";
import * as z from "zod/v4";
import { authActionClient } from "./safe-action";

const getExpectedScriptForWorkspace = (store: Record<string, any>) => {
  const {
    analyticsSettingsConversionTrackingEnabled: conversionTrackingEnabled,
    analyticsSettingsSiteVisitTrackingEnabled: siteVisitEnabled,
    analyticsSettingsOutboundDomainTrackingEnabled: outboundDomainsEnabled,
  } = store;

  const components = [
    "script",
    siteVisitEnabled ? "site-visit" : null,
    outboundDomainsEnabled ? "outbound-domains" : null,
    conversionTrackingEnabled ? "conversion-tracking" : null,
  ].filter(Boolean);

  return `${components.join(".")}.js`;
};

const schema = z.object({
  workspaceId: z.string(),
});

// Attempt to verify the workspace setup
export const verifyWorkspaceSetup = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    const domains = await prisma.domain.findMany({
      where: { projectId: workspace.id },
      select: { slug: true },
    });

    const domain = domains[0];

    if (!domain) {
      throw new Error(`Please setup a domain`);
    }

    // const siteUrl = domain.slug;
    const siteUrl = "https://dub.co/home";

    const hostnames = (workspace.allowedHostnames as string[]) || [];

    if (!hostnames.length) {
      throw new Error(`Add a hostname for your domain`);
    }

    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const scrapeResult = await firecrawl.scrapeUrl(siteUrl, {
      formats: ["rawHtml"],
      onlyMainContent: false,
      parsePDF: false,
      includeTags: ["head"],
      maxAge: 14400000,
      waitFor: 5000,
    });

    if (!scrapeResult.success) {
      throw new Error("Failed to verify site");
    }

    //console.log("RAW HTML: ", scrapeResult.rawHtml);

    console.log(`result: `, {
      hasDataAttribute: scrapeResult.rawHtml?.includes(
        `data-sdkn="@dub/analytics"`,
      ),
      hasExpectedScript: scrapeResult.rawHtml?.includes(
        getExpectedScriptForWorkspace(workspace.store as Record<string, any>),
      ),
    });

    return {
      verifiedAt: new Date().toISOString(),
      // analyticsScriptSrc: scriptTag,
    };
  });
