import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getEffectiveBountyPeriod } from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getSocialMetricsUpdates } from "@/lib/bounty/api/get-social-metrics-updates";
import { isBountyEnded, isBountyStarted } from "@/lib/bounty/bounty-period";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const inputSchema = z.object({
  submissionId: z
    .string()
    .optional()
    .describe(
      "The ID of the submission to sync social metrics for. If not provided, all submissions will be synced.",
    ),
});

// POST /api/bounties/[bountyId]/sync-social-metrics - sync social metrics for a bounty
export const POST = withWorkspace(
  async ({ workspace, params, req }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { submissionId } = inputSchema.parse(await parseRequestBody(req));

    const bounty = await getBountyOrThrow({
      bountyId,
      programId,
      include: submissionId
        ? {
            program: {
              select: {
                name: true,
                slug: true,
                supportEmail: true,
              },
            },
            submissions: {
              where: {
                id: submissionId,
              },
              select: {
                id: true,
                urls: true,
                status: true,
                partner: true,
                programEnrollment: {
                  select: {
                    createdAt: true,
                  },
                },
              },
            },
          }
        : undefined,
    });

    const bountyInfo = resolveBountyDetails(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social metrics requirements.",
      });
    }

    // Bounty-wide sync (no submissionId): run asynchronously via a background job
    if (!submissionId) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/sync-social-metrics`,
        method: "POST",
        body: {
          bountyId,
        },
      });

      if (!response.messageId) {
        throw new DubApiError({
          code: "bad_request",
          message: "Could not sync social metrics for this bounty now.",
        });
      }

      return NextResponse.json({});
    }

    // Single-submission sync
    const submission = bounty.submissions?.[0];

    if (!submission || !submission.programEnrollment) {
      throw new DubApiError({
        code: "not_found",
        message: `Submission ${submissionId} not found.`,
      });
    }

    if (submission.status === "approved") {
      throw new DubApiError({
        code: "bad_request",
        message: "Social metrics can't be synced for an approved submission.",
      });
    }

    const { startsAt, endsAt } = getEffectiveBountyPeriod({
      programEnrollment: submission.programEnrollment,
      bounty,
    });

    if (!isBountyStarted(startsAt)) {
      throw new DubApiError({
        code: "bad_request",
        message: "Social metrics can only be synced after the bounty starts.",
      });
    }

    if (isBountyEnded(endsAt)) {
      throw new DubApiError({
        code: "bad_request",
        message: "Social metrics can't be synced after the bounty ends.",
      });
    }

    // Otherwise, do the sync for the specific submission
    const toUpdate = await getSocialMetricsUpdates({
      bounty,
      submissions: bounty.submissions![0],
    });

    if (toUpdate.length > 0) {
      const update = toUpdate.find((s) => s.id === submissionId);

      if (!update) {
        return NextResponse.json({});
      }

      const { socialMetricCount, socialMetricsLastSyncedAt } = update;
      const submission = bounty.submissions![0];

      const updateData: Prisma.BountySubmissionUpdateInput = {
        socialMetricCount,
        socialMetricsLastSyncedAt,
      };

      const hasMetCriteria =
        socialMetricCount != null &&
        bountyInfo.socialMetrics?.minCount != null &&
        socialMetricCount >= bountyInfo.socialMetrics.minCount;

      const shouldTransitionToSubmitted =
        submission.status === "draft" && hasMetCriteria;

      if (shouldTransitionToSubmitted) {
        updateData.status = "submitted";
        updateData.completedAt = new Date();
      }

      await prisma.bountySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          ...updateData,
        },
      });

      const { partner } = submission;

      if (shouldTransitionToSubmitted && partner.email) {
        await sendEmail({
          subject: "Bounty completed!",
          to: partner.email,
          variant: "notifications",
          replyTo: bounty.program.supportEmail || "noreply",
          react: BountyCompleted({
            email: partner.email,
            bounty: {
              name: bounty.name,
              type: bounty.type,
            },
            program: {
              name: bounty.program.name,
              slug: bounty.program.slug,
            },
          }),
          headers: {
            "Idempotency-Key": `bounty-completed-${submissionId}`,
          },
        });
      }
    }

    return NextResponse.json({});
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
