import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getSocialMetricsUpdates } from "@/lib/bounty/api/get-social-metrics-updates";
import { getBountySocialMetricsRequirements } from "@/lib/bounty/utils";
import { qstash } from "@/lib/cron";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
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
            submissions: {
              where: {
                id: submissionId,
              },
              select: {
                id: true,
                urls: true,
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

    if (!getBountySocialMetricsRequirements(bounty)) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bounty does not have social metrics requirements.",
      });
    }

    if (process.env.NODE_ENV !== "development") {
      const { success } = await ratelimit(1, "1 h").limit(
        `sync-bounty-social:${bountyId}`,
      );

      if (!success) {
        throw new DubApiError({
          code: "rate_limited",
          message:
            "Refresh is limited to once per hour. Please try again later.",
        });
      }
    }

    // Do the sync in a background job
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
    });

    if (toUpdate.length > 0) {
      const { socialMetricCount, socialMetricsLastSyncedAt } = toUpdate.find(
        (s) => s.id === submissionId,
      )!;

      await prisma.bountySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          socialMetricCount,
          socialMetricsLastSyncedAt,
        },
      });
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
