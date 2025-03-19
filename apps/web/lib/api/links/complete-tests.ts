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
  if (!link.tests || !link.testsCompleteAt || !link.projectId) return;

  const tests = LinkTestsSchema.parse(link.tests);

  const analytics = (await getAnalytics({
    event: "leads",
    groupBy: "top_urls",
    linkId: link.id,
    workspaceId: link.projectId,
    dataAvailableFrom: link.project.createdAt,
    start: link.testsStartedAt ? new Date(link.testsStartedAt) : undefined,
    end: link.testsCompleteAt,
  })) as { url: string; leads: number }[];

  const max = Math.max(
    ...tests.map(
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

  const winners = tests.filter(
    (test) =>
      (analytics.find(({ url }) => url === test.url)?.leads || 0) === max,
  );

  if (winners.length === 0)
    throw new Error(
      `completeTests: Failed to find winners based on max leads for link ${link.id}`,
    );

  const winner = winners[Math.floor(Math.random() * winners.length)];
  console.log(
    `completeTests: Determined A/B tests winner for ${link.id}: ${winner.url}${winners.length > 1 ? ` (${winners.length} tied)` : ""}`,
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

    tests: link.tests as NewLinkProps["tests"],
    testsCompleteAt:
      link.testsCompleteAt instanceof Date
        ? link.testsCompleteAt.toISOString()
        : link.testsCompleteAt,
    testsStartedAt:
      link.testsStartedAt instanceof Date
        ? link.testsStartedAt.toISOString()
        : link.testsStartedAt,

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
      testsCompleteAt: link.testsCompleteAt,
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
