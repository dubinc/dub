import { getSocialMetricsUpdates } from "@/lib/bounty/api/get-social-metrics-updates";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import { prisma } from "@dub/prisma";
import { Partner, Prisma } from "@dub/prisma/client";
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
    include: {
      program: true,
    },
  });

  if (!bounty) {
    return logAndRespond(`Bounty ${bountyId} not found. Skipping...`);
  }

  const now = new Date();

  if (bounty.startsAt && bounty.startsAt > now) {
    return logAndRespond(`Bounty ${bountyId} has not started yet. Skipping...`);
  }

  if (bounty.endsAt && bounty.endsAt < now) {
    return logAndRespond(`Bounty ${bountyId} has ended. Skipping...`);
  }

  const bountyInfo = resolveBountyDetails(bounty);

  if (!bountyInfo?.hasSocialMetrics) {
    return logAndRespond(
      `Bounty ${bountyId} has no social metrics requirements. Skipping...`,
    );
  }

  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId,
      status: {
        // We only want to process submissions that are not rejected or approved.
        notIn: ["rejected", "approved"],
      },
    },
    select: {
      id: true,
      urls: true,
      socialMetricCount: true,
      status: true,
      partner: {
        select: {
          email: true,
        },
      },
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

  const newMetrics = await getSocialMetricsUpdates({
    bounty,
    submissions,
  });

  const minCount = bountyInfo.socialMetrics?.minCount;

  if (!minCount) {
    return logAndRespond(
      `Bounty ${bountyId} has no minimum social metrics count. Skipping...`,
    );
  }

  const submissionById = new Map(submissions.map((s) => [s.id, s]));

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const notifications: Pick<Partner, "email">[] = [];

  for (const {
    id,
    socialMetricCount,
    socialMetricsLastSyncedAt,
  } of newMetrics) {
    const submission = submissionById.get(id);

    if (!submission) {
      continue;
    }

    const hasMetCriteria =
      socialMetricCount != null && socialMetricCount >= minCount;

    const shouldTransitionToSubmitted =
      submission.status === "draft" && hasMetCriteria;

    const updateData: Prisma.BountySubmissionUpdateInput = {
      socialMetricCount,
      socialMetricsLastSyncedAt,
    };

    if (shouldTransitionToSubmitted) {
      updateData.status = "submitted";
      updateData.completedAt = now;

      if (submission.partner?.email) {
        notifications.push({
          email: submission.partner.email,
        });
      }
    }

    updates.push(
      prisma.bountySubmission.update({
        where: {
          id,
        },
        data: updateData,
      }),
    );
  }

  await prisma.$transaction(updates);

  if (notifications.length > 0 && bounty.program) {
    await sendBatchEmail(
      notifications.map(({ email }) => ({
        subject: "Bounty completed!",
        to: email!,
        variant: "notifications",
        replyTo: bounty.program.supportEmail || "noreply",
        react: BountyCompleted({
          email: email!,
          bounty: {
            name: bounty.name,
            type: bounty.type,
          },
          program: {
            name: bounty.program.name,
            slug: bounty.program.slug,
          },
        }),
      })),
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
      `Synced ${updates.length} submissions for bounty ${bountyId}. Queued next batch (startingAfter: ${startingAfter}).`,
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
    `Synced ${updates.length} submission(s) for bounty ${bountyId}.`,
  );
});
