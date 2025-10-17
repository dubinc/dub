import { getAnalytics } from "@/lib/analytics/get-analytics";
import { recordLink } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { ABTestVariantsSchema, linkEventSchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { normalizeUrl } from "@dub/utils";
import { Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { includeTags } from "./include-tags";

export async function completeABTests(link: Link) {
  if (!link.testVariants || !link.testCompletedAt || !link.projectId) {
    return;
  }

  const testVariants = ABTestVariantsSchema.parse(link.testVariants);

  // Fetch composite analytics (clicks, leads, sales, saleAmount) grouped by URLs
  const analytics: {
    url: string;
    clicks: number;
    leads: number;
    sales: number;
    saleAmount: number;
  }[] = await getAnalytics({
    event: "composite",
    groupBy: "top_urls",
    linkId: link.id,
    workspaceId: link.projectId,
    start: link.testStartedAt ? new Date(link.testStartedAt) : undefined,
    end: link.testCompletedAt,
  });

  // Aggregate analytics by normalized URL for stable matching with variants
  const analyticsByNormalizedUrl = new Map<
    string,
    { clicks: number; leads: number; sales: number; saleAmount: number }
  >();

  for (const row of analytics || []) {
    const key = normalizeUrl(row.url);
    const existing = analyticsByNormalizedUrl.get(key);
    if (existing) {
      analyticsByNormalizedUrl.set(key, {
        clicks: (existing.clicks || 0) + (row.clicks || 0),
        leads: (existing.leads || 0) + (row.leads || 0),
        sales: (existing.sales || 0) + (row.sales || 0),
        saleAmount: (existing.saleAmount || 0) + (row.saleAmount || 0),
      });
    } else {
      analyticsByNormalizedUrl.set(key, {
        clicks: row.clicks || 0,
        leads: row.leads || 0,
        sales: row.sales || 0,
        saleAmount: row.saleAmount || 0,
      });
    }
  }

  type VariantMetrics = {
    url: string;
    clicks: number;
    leads: number;
    conversions: number; // sales
  };

  const variants: VariantMetrics[] = testVariants.map((tv) => {
    const key = normalizeUrl(tv.url);
    const a = analyticsByNormalizedUrl.get(key);
    return {
      url: tv.url,
      clicks: a?.clicks ?? 0,
      leads: a?.leads ?? 0,
      conversions: a?.sales ?? 0,
    };
  });

  const safeRate = (num: number, den: number) => (den > 0 ? num / den : 0);

  const maxConversions = Math.max(0, ...variants.map((v) => v.conversions));

  let candidateUrls: string[] = [];

  if (maxConversions > 0) {
    // Primary path: conversions -> conversion rate -> clicks
    const maxConv = maxConversions;
    const convCandidates = variants.filter((v) => v.conversions === maxConv);
    if (convCandidates.length === 1) {
      candidateUrls = [convCandidates[0].url];
    } else {
      const maxConvRate = Math.max(
        0,
        ...convCandidates.map((v) => safeRate(v.conversions, v.clicks)),
      );
      const rateCandidates = convCandidates.filter(
        (v) => safeRate(v.conversions, v.clicks) === maxConvRate,
      );
      if (rateCandidates.length === 1) {
        candidateUrls = [rateCandidates[0].url];
      } else {
        const maxClicks = Math.max(0, ...rateCandidates.map((v) => v.clicks));
        const clickCandidates = rateCandidates.filter(
          (v) => v.clicks === maxClicks,
        );
        if (clickCandidates.length === 1) {
          candidateUrls = [clickCandidates[0].url];
        } else {
          // Still tied after all tie-breakers: do not pick randomly
          candidateUrls = [];
        }
      }
    }
  } else {
    // Fallback path: all variants have zero conversions
    // leads -> lead rate -> clicks
    const maxLeads = Math.max(0, ...variants.map((v) => v.leads));
    const leadCandidates = variants.filter((v) => v.leads === maxLeads);
    if (leadCandidates.length === 1) {
      candidateUrls = [leadCandidates[0].url];
    } else {
      const maxLeadRate = Math.max(
        0,
        ...leadCandidates.map((v) => safeRate(v.leads, v.clicks)),
      );
      const rateCandidates = leadCandidates.filter(
        (v) => safeRate(v.leads, v.clicks) === maxLeadRate,
      );
      if (rateCandidates.length === 1) {
        candidateUrls = [rateCandidates[0].url];
      } else {
        const maxClicks = Math.max(0, ...rateCandidates.map((v) => v.clicks));
        const clickCandidates = rateCandidates.filter(
          (v) => v.clicks === maxClicks,
        );
        if (clickCandidates.length === 1) {
          candidateUrls = [clickCandidates[0].url];
        } else {
          // Still tied after all tie-breakers: do not pick randomly
          candidateUrls = [];
        }
      }
    }
  }

  if (candidateUrls.length !== 1) {
    console.log(
      `AB Test completed for ${link.id} but no deterministic winner after tie-breakers. Keeping original destination URL.`,
    );
    return;
  }

  const winner = { url: candidateUrls[0] };

  if (winner.url === link.url) {
    return;
  }

  const response = await prisma.link.update({
    where: {
      id: link.id,
    },
    data: {
      url: winner.url,
    },
    include: {
      ...includeTags,
      project: true,
    },
  });

  waitUntil(
    Promise.allSettled([
      // update the link cache
      linkCache.set(response),
      // record the link
      recordLink(response),
      // send a link.updated webhook to the workspace
      response.project &&
        sendWorkspaceWebhook({
          trigger: "link.updated",
          workspace: response.project,
          data: linkEventSchema.parse(response),
        }),
    ]),
  );
}
