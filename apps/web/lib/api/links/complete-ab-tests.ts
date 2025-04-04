import { getAnalytics } from "@/lib/analytics/get-analytics";
import { recordLink } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { ABTestVariantsSchema, linkEventSchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { includeTags } from "./include-tags";

export async function completeABTests(link: Link) {
  if (!link.testVariants || !link.testCompletedAt || !link.projectId) {
    return;
  }

  const testVariants = ABTestVariantsSchema.parse(link.testVariants);

  const analytics: { url: string; leads: number }[] = await getAnalytics({
    event: "leads",
    groupBy: "top_urls",
    linkId: link.id,
    workspaceId: link.projectId,
    start: link.testStartedAt ? new Date(link.testStartedAt) : undefined,
    end: link.testCompletedAt,
  });

  const max = Math.max(
    ...testVariants.map(
      (test) => analytics.find(({ url }) => url === test.url)?.leads || 0,
    ),
  );

  // There are no leads generated for any test variant, do nothing
  if (max === 0) {
    console.log(
      `AB Test completed but all results are zero for ${link.id}, doing nothing.`,
    );
    return;
  }

  const winners = testVariants.filter(
    (test) =>
      (analytics.find(({ url }) => url === test.url)?.leads || 0) === max,
  );

  // this should NEVER happen, but just in case
  if (winners.length === 0) {
    console.log(
      `AB Test completed but failed to find winners based on max leads for link ${link.id}, doing nothing.`,
    );
    return;
  }

  const winner = winners[Math.floor(Math.random() * winners.length)];

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
