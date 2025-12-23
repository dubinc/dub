import { triggerDraftBountySubmissionCreation } from "@/lib/api/bounties/trigger-draft-bounty-submissions";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

const addPartnersToGroupSchema = z.object({
  partnerIds: z.array(z.string()).min(1).max(100), // max move 100 partners at a time
});

// POST /api/groups/[groupIdOrSlug]/partners - add partners to group
export const POST = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
      includeExpandedFields: true,
    });

    let { partnerIds } = addPartnersToGroupSchema.parse(
      await parseRequestBody(req),
    );

    partnerIds = [...new Set(partnerIds)];

    if (partnerIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "At least one partner ID is required.",
      });
    }

    const { count } = await prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      data: {
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      },
    });

    if (count > 0) {
      waitUntil(
        (async () => {
          const partnerLinks = await prisma.link.findMany({
            where: {
              programId,
              partnerId: {
                in: partnerIds,
              },
            },
            include: {
              ...includeTags,
              ...includeProgramEnrollment,
            },
          });

          await Promise.allSettled([
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-default-links`,
              body: {
                programId,
                groupId: group.id,
                partnerIds,
                userId: session.user.id,
              },
            }),

            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-discount-codes`,
              body: {
                programId,
                partnerIds,
                groupId: group.id,
              },
            }),

            triggerDraftBountySubmissionCreation({
              programId,
              partnerIds,
            }),

            recordLink(partnerLinks),
          ]);
        })(),
      );
    }

    return NextResponse.json({
      count,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
