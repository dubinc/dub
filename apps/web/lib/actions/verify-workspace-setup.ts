"use server";

import { prisma } from "@dub/prisma";
import { getHtml } from "app/api/links/metatags/utils";
import { parse } from "node-html-parser";
import z from "../zod";
import { authActionClient } from "./safe-action";

// Improved getScriptTags: more robust extraction of script src and inline content
const getScriptTags = (html: string) => {
  const ast = parse(html, {
    blockTextElements: {
      script: true,
    },
  });

  // node-html-parser v6: .querySelectorAll returns Node[], which may be HTMLElement or TextNode
  // We want to extract both src and inline content
  return ast.querySelectorAll("script").map((node) => {
    // node.getAttribute returns undefined if not present
    const src = node.getAttribute("src") || null;
    // node.innerHTML gives the inline script content
    // node.text gives the text content (should be same for script)
    const content = node.innerHTML?.trim() || null;
    return { src, content };
  });
};

const expectedScriptForWorkspace = (workspace: any) => {
  const store = workspace.store as Record<string, any>;

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

type DubScript = {};

const getDubScript = (html: string): DubScript | null => {
  const scripts = getScriptTags(html);

  console.log("SCRIPTS:");
  console.log(scripts.map((s) => s.src).filter(Boolean));
  return null;
};

const schema = z.object({
  workspaceId: z.string(),
});

// Attempt to verify the workspace setup
export const verifyWorkspaceSetup = authActionClient
  .schema(schema)
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

    // Verify the hostname is allowed for the domain
    const hostnames = (workspace.allowedHostnames as string[]) || [];

    if (!hostnames.length) {
      throw new Error(`Add a hostname for your domain`);
    }

    const expectedScript = expectedScriptForWorkspace(workspace);

    // Scrape the domain for scripts and find the analytics script tag
    // const firecrawl = new FirecrawlApp({
    //   apiKey: process.env.FIRECRAWL_API_KEY,
    // });

    // const scrapeResult = await firecrawl.scrapeUrl(siteUrl, {
    //   formats: ["html"],
    //   onlyMainContent: false,
    //   parsePDF: false,
    //   maxAge: 14400000,
    // });

    // if (!scrapeResult.success) {
    //   throw new Error("Failed to verify site");
    // }

    const html = await getHtml(siteUrl);

    if (!html) {
      throw new Error("Failed to verify site");
    }

    const dubScript = getDubScript(html);

    if (!dubScript) {
      throw new Error("Dub script not found");
    }

    // console.log(`result: `);
    // // console.log(scrapeResult.html);

    // // Try to find the analytics script tag in links
    // let analyticsScriptSrc: string | null = null;

    // // If not found in links, try to find in HTML using regex
    // if (!analyticsScriptSrc && scrapeResult.html) {
    //   const scriptRegex =
    //     /<script[^>]+src=["'](https:\/\/www\.dubcdn\.com\/analytics[^"']*)["'][^>]*><\/script>/gi;
    //   const matches = [...scrapeResult.html.matchAll(scriptRegex)];
    //   console.log("MATCHES");
    //   console.log(matches);
    //   if (matches.length > 0) {
    //     analyticsScriptSrc = matches[0][1];
    //   }
    // }

    // console.log(`SCRIPT: ${analyticsScriptSrc}`);

    // Find the script tag for https://www.dubcdn.com/analytics
    // Try to find in links first, then fallback to html if needed
    // let analyticsScriptFound = false;
    // let scriptTag: string | null = null;

    // const script = scrapeResult.links?.find(link => {
    // return link.type === "script" &&
    // typeof link.src === "string" &&
    // link.src.startsWith("https://www.dubcdn.com/analytics")

    // });

    // // Check in links
    // if (scrapeResult.links && Array.isArray(scrapeResult.links)) {
    //   for (const link of scrapeResult.links) {
    //     if (
    //     ) {
    //       analyticsScriptFound = true;
    //       scriptTag = link.src;
    //       break;
    //     }
    //   }
    // }

    // If not found in links, try to parse from HTML
    // if (!analyticsScriptFound && scrapeResult.html) {
    //   // Use a simple regex to find the script tag
    //   const scriptRegex =
    //     /<script[^>]+src=["'](https:\/\/www\.dubcdn\.com\/analytics[^"']*)["'][^>]*><\/script>/gi;
    //   const matches = [...scrapeResult.html.matchAll(scriptRegex)];
    //   if (matches.length > 0) {
    //     analyticsScriptFound = true;
    //     scriptTag = matches[0][1];
    //   }
    // }

    // if (!analyticsScriptFound) {
    //   throw new Error(
    //     "Could not find the analytics script tag for https://www.dubcdn.com/analytics on your site.",
    //   );
    // }

    // Optionally, you could check if the scriptTag matches the expectedScript
    // For now, just return the found script src

    // Handle data domains
    // You definid

    // Check refer
    // usePropgram -- domain -- if they have a program domain, we construct the script with the refer prop matching the domain
    // if not, they are running a referral program they need to know

    // Check site

    // Check outbound matches

    return {
      verifiedAt: new Date().toISOString(),
      // analyticsScriptSrc: scriptTag,
    };
  });
