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
import { Prisma } from "@dub/prisma/client";
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

    const bountyInfo = getBountyInfo(bounty);

    if (!bountyInfo?.socialMetrics) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social metrics requirements.",
      });
    }

    const submission = submissionId ? bounty.submissions?.[0] : undefined;

    if (submissionId) {
      if (!submission) {
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
    }

    const now = new Date();

    if (bounty.startsAt && bounty.startsAt > now) {
      throw new DubApiError({
        code: "bad_request",
        message: "Social metrics can only be synced after the bounty starts.",
      });
    }

    if (bounty.endsAt && bounty.endsAt < now) {
      throw new DubApiError({
        code: "bad_request",
        message: "Social metrics can't be synced after the bounty ends.",
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
      skipCache: true,
    });

    if (toUpdate.length > 0) {
      const update = toUpdate.find((s) => s.id === submissionId);

      if (!update) {
        return NextResponse.json({});
      }

      const { socialMetricCount, socialMetricsLastSyncedAt } = update;
      const submission = bounty.submissions![0];
      const minCount = bountyInfo.socialMetrics?.minCount ?? 0;

      const updateData: Prisma.BountySubmissionUpdateInput = {
        socialMetricCount,
        socialMetricsLastSyncedAt,
      };

      const hasMetCriteria =
        socialMetricCount != null && socialMetricCount >= minCount;

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
