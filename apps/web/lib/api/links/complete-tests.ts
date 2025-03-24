import { getAnalytics } from "@/lib/analytics/get-analytics";
import { NewLinkProps, WorkspaceProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema, LinkTestsSchema } from "@/lib/zod/schemas/links";
import { Link, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { DubApiError, ErrorCodes } from "../errors";
import { processLink } from "./process-link";
import { updateLink } from "./update-link";

export async function completeTests(link: Link & { project: Project }) {
  if (!link.testVariants || !link.testCompletedAt || !link.projectId) return;

  const testVariants = LinkTestsSchema.parse(link.testVariants);

  const analytics = (await getAnalytics({
    event: "leads",
    groupBy: "top_urls",
    linkId: link.id,
    workspaceId: link.projectId,
    dataAvailableFrom: link.project.createdAt,
    start: link.testStartedAt ? new Date(link.testStartedAt) : undefined,
    end: link.testCompletedAt,
  })) as { url: string; leads: number }[];

  const max = Math.max(
    ...testVariants.map(
      (test) => analytics.find(({ url }) => url === test.url)?.leads || 0,
    ),
  );

  if (max === 0) {
    // All results are zero, do nothing
    console.log(
      `completeTests: All results are zero for ${link.id}, doing nothing`,
    );
    return;
  }

  const winners = testVariants.filter(
    (test) =>
      (analytics.find(({ url }) => url === test.url)?.leads || 0) === max,
  );

  if (winners.length === 0)
    throw new Error(
      `completeTests: Failed to find winners based on max leads for link ${link.id}`,
    );

  const winner = winners[Math.floor(Math.random() * winners.length)];
  console.log(
    `completeTests: Determined A/B testVariants winner for ${link.id}: ${winner.url}${winners.length > 1 ? ` (${winners.length} tied)` : ""}`,
  );

  if (winner.url === link.url) return;

  // Update the link's URL to the winner

  // Add body onto existing link but maintain NewLinkProps form for processLink
  const { project, ...originalLink } = link;

  const updatedLink = {
    ...originalLink,
    expiresAt:
      link.expiresAt instanceof Date
        ? link.expiresAt.toISOString()
        : link.expiresAt,
    geo: link.geo as NewLinkProps["geo"],

    testVariants: link.testVariants as NewLinkProps["testVariants"],
    testCompletedAt:
      link.testCompletedAt instanceof Date
        ? link.testCompletedAt.toISOString()
        : link.testCompletedAt,
    testStartedAt:
      link.testStartedAt instanceof Date
        ? link.testStartedAt.toISOString()
        : link.testStartedAt,

    // Update URL
    url: winner.url,

    // When root domain
    ...(link.key === "_root" && {
      domain: link.domain,
      key: link.key,
    }),
  };

  const {
    link: processedLink,
    error,
    code,
  } = await processLink({
    payload: updatedLink,
    workspace: link.project as WorkspaceProps,
    skipKeyChecks: true,
    skipExternalIdChecks: true,
    skipFolderChecks: true,
  });

  if (error) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const response = await updateLink({
    oldLink: {
      domain: link.domain,
      key: link.key,
      image: link.image,
    },
    updatedLink: processedLink,
  });

  waitUntil(
    sendWorkspaceWebhook({
      trigger: "link.updated",
      workspace: link.project,
      data: linkEventSchema.parse(response),
    }),
  );
}
