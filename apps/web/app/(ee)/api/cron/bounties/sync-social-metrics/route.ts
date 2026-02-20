import { getSocialMetricsUpdates } from "@/lib/bounty/api/get-social-metrics-updates";
import { getBountyInfo } from "@/lib/bounty/utils";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bountyId: z.string(),
  startingAfter: z
    .string()
    .optional()
    .describe("The ID of the submission to start processing from."),
});

const SUBMISSION_BATCH_SIZE = 50;

// POST /api/cron/bounties/sync-social-metrics - sync social metrics for a bounty
export const POST = withCron(async ({ rawBody }) => {
  const { bountyId, startingAfter } = bodySchema.parse(JSON.parse(rawBody));

  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
  });

  if (!bounty) {
    return logAndRespond(`Bounty ${bountyId} not found. Skipping...`);
  }

  // TODO:
  // Should we prevent syncing social metrics for bounties that are not started yet or have ended?

  const bountyInfo = getBountyInfo(bounty);

  if (!bountyInfo?.hasSocialMetrics) {
    return logAndRespond(
      `Bounty ${bountyId} has no social metrics requirements. Skipping...`,
    );
  }

  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId,
      status: {
        notIn: ["rejected"],
      },
    },
    select: {
      id: true,
      urls: true,
      socialMetricCount: true,
      status: true,
    },
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    take: SUBMISSION_BATCH_SIZE,
  });

  if (submissions.length === 0) {
    return logAndRespond(
      `No submissions found for bounty ${bountyId}. Skipping...`,
    );
  }

  const hasAnyUrl = submissions.some(
    (s) => Array.isArray(s.urls) && s.urls.length > 0,
  );

  if (!hasAnyUrl) {
    return logAndRespond(
      `No submissions to process for bounty ${bountyId}. Skipping...`,
    );
  }

  const toUpdate = await getSocialMetricsUpdates({
    bounty,
    submissions,
  });

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map(({ id, socialMetricCount, socialMetricsLastSyncedAt }) =>
        prisma.bountySubmission.update({
          where: {
            id,
          },
          data: {
            socialMetricCount,
            socialMetricsLastSyncedAt,
          },
        }),
      ),
    );
  }

  if (submissions.length === SUBMISSION_BATCH_SIZE) {
    const startingAfter = submissions[submissions.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/sync-social-metrics`,
      method: "POST",
      body: {
        bountyId,
        startingAfter,
      },
    });

    return logAndRespond(
      `Synced ${toUpdate.length} submissions for bounty ${bountyId}. Queued next batch (startingAfter: ${startingAfter}).`,
    );
  }

  await prisma.bounty.update({
    where: {
      id: bountyId,
    },
    data: {
      socialMetricsLastSyncedAt: new Date(),
    },
  });

  return logAndRespond(
    `Synced ${toUpdate.length} submission(s) for bounty ${bountyId}.`,
  );
});
