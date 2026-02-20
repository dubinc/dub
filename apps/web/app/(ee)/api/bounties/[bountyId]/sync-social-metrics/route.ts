import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getSocialMetricsUpdates } from "@/lib/bounty/api/get-social-metrics-updates";
import { getBountyInfo } from "@/lib/bounty/utils";
import { qstash } from "@/lib/cron";
import { sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import { prisma } from "@dub/prisma";
import { BountySubmissionStatus } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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
              },
            },
          }
        : undefined,
    });

    if (
      submissionId &&
      (!bounty.submissions || bounty.submissions.length === 0)
    ) {
      throw new DubApiError({
        code: "not_found",
        message: `Submission ${submissionId} not found.`,
      });
    }

    const bountyInfo = getBountyInfo(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social metrics requirements.",
      });
    }

    // Do the sync in a background job if no submissionId is provided
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

    // Otherwise, do the sync for the specific submission
    const toUpdate = await getSocialMetricsUpdates({
      bounty,
      submissions: bounty.submissions![0],
      ignoreCache: true,
    });

    if (toUpdate.length > 0) {
      const { socialMetricCount, socialMetricsLastSyncedAt } = toUpdate.find(
        (s) => s.id === submissionId,
      )!;

      if (socialMetricCount) {
        const submission = bounty.submissions![0];

        let status: BountySubmissionStatus = submission.status;
        let transitionedToSubmitted = false;

        if (status === "draft") {
          const hasMetCriteria =
            socialMetricCount &&
            bountyInfo.socialMetrics.minCount &&
            socialMetricCount >= bountyInfo.socialMetrics.minCount;

          if (hasMetCriteria) {
            status = "submitted";
            transitionedToSubmitted = true;
          }
        }

        await prisma.bountySubmission.update({
          where: {
            id: submissionId,
          },
          data: {
            status,
            socialMetricCount,
            socialMetricsLastSyncedAt,
          },
        });

        if (transitionedToSubmitted && bounty.program && submission.partner) {
          const { partner } = submission;

          if (partner.email) {
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
            });
          }
        }
      }
    }

    return NextResponse.json({});
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
