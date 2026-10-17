import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { ABTestVariantsSchema, linkEventSchema } from "@/lib/zod/schemas/links";
import { Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { includeProgramEnrollment } from "./include-program-enrollment";
import { includeTags } from "./include-tags";

// Analytics groups by base URL with a trailing slash (e.g. "https://dub.co/"),
// while test variants store the URL without one
const normalizeUrl = (url: string) => url.replace(/\/$/, "");

type VariantStats = {
  url: string;
  clicks: number;
  leads: number;
  sales: number;
};

export async function completeABTests(link: Link) {
  if (!link.testVariants || !link.testCompletedAt || !link.projectId) {
    return;
  }

  const testVariants = ABTestVariantsSchema.parse(link.testVariants);

  const analytics: {
    url: string;
    clicks: number;
    leads: number;
    sales: number;
    saleAmount: number;
  }[] = await getAnalytics({
    event: "composite",
    groupBy: "top_base_urls",
    linkId: link.id,
    workspaceId: link.projectId,
    start: link.testStartedAt ? new Date(link.testStartedAt) : undefined,
    end: link.testCompletedAt,
  });

  const stats: VariantStats[] = testVariants.map((test) => {
    const variantAnalytics = analytics.find(
      ({ url }) => normalizeUrl(url) === normalizeUrl(test.url),
    );

    return {
      url: test.url,
      clicks: variantAnalytics?.clicks ?? 0,
      leads: variantAnalytics?.leads ?? 0,
      sales: variantAnalytics?.sales ?? 0,
    };
  });

  // No data recorded for any variant, do nothing
  if (stats.every(({ clicks, leads, sales }) => !clicks && !leads && !sales)) {
    console.log(
      `AB Test completed but all results are zero for ${link.id}, doing nothing.`,
    );
    return;
  }

  // If any conversions were recorded, pick by conversions, then conversion
  // rate, then clicks. Otherwise pick by leads, then lead rate, then clicks.
  const criteria: ((stats: VariantStats) => number)[] = stats.some(
    ({ sales }) => sales > 0,
  )
    ? [
        ({ sales }) => sales,
        ({ sales, clicks }) => (clicks > 0 ? sales / clicks : 0),
        ({ clicks }) => clicks,
      ]
    : [
        ({ leads }) => leads,
        ({ leads, clicks }) => (clicks > 0 ? leads / clicks : 0),
        ({ clicks }) => clicks,
      ];

  let candidates = stats;
  for (const criterion of criteria) {
    const max = Math.max(...candidates.map(criterion));
    candidates = candidates.filter((stats) => criterion(stats) === max);
    if (candidates.length === 1) break;
  }

  // Fully tied on all criteria – pick randomly among the tied variants
  const winner = candidates[Math.floor(Math.random() * candidates.length)];

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
      ...includeProgramEnrollment,
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
