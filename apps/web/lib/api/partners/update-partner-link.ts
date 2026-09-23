import { trackLinkRewardOverrideLog } from "@/lib/api/activity-log/track-reward-overrides";
import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { notifyPartnerRewardOverride } from "@/lib/api/partners/notify-partner-reward-change";
import {
  hasRewardAssignment,
  hasRewardIdsInput,
  pickDefinedRewardIds,
  RewardOverrideIdsInput,
  toPartnerLinkRewardIdFields,
} from "@/lib/api/rewards/reward-overrides";
import { throwIfInvalidRewards } from "@/lib/api/rewards/throw-if-invalid-rewards";
import { syncDiscountCodes } from "@/lib/discounts/sync-discount-codes";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_LEVEL_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { WorkspaceProps } from "@/lib/types";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

type UpdatePartnerLinkParams = {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  programId: string;
  linkId: string;
  userId: string;
  activityDescription?: z.infer<
    typeof updatePartnerLinkSchema
  >["activityDescription"];
} & RewardOverrideIdsInput;

export async function updatePartnerLink({
  workspace,
  programId,
  linkId,
  userId,
  activityDescription,
  ...body
}: UpdatePartnerLinkParams) {
  if (!hasRewardIdsInput(body)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "At least one of clickRewardId, leadRewardId, saleRewardId, or discountId must be provided.",
    });
  }

  if (
    hasRewardAssignment(body) &&
    !getPlanCapabilities(workspace.plan).canUseAdvancedRewardLogic
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: PARTNER_LEVEL_REWARDS_PLAN_ERROR,
    });
  }

  const link = await getLinkOrThrow({
    workspaceId: workspace.id,
    linkId,
  });

  if (link.programId !== programId || !link.partnerId) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner link not found.",
    });
  }

  const [existingLinkReward, programEnrollment] = await Promise.all([
    prisma.linkReward.findUnique({
      where: {
        linkId: link.id,
      },
      select: {
        clickRewardId: true,
        leadRewardId: true,
        saleRewardId: true,
        discountId: true,
      },
    }),

    prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: link.partnerId,
          programId,
        },
      },
      select: {
        groupId: true,
        discountId: true,
        groupMoveDisabledAt: true,
        partnerGroup: {
          select: {
            clickRewardId: true,
            leadRewardId: true,
            saleRewardId: true,
            discountId: true,
          },
        },
      },
    }),
  ]);

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner not found.",
    });
  }

  const { partnerGroup } = programEnrollment;

  const linkRewardInput = pickDefinedRewardIds(body);

  await throwIfInvalidRewards({
    programId,
    groupId: programEnrollment.groupId,
    ...linkRewardInput,
  });

  const linkReward =
    hasRewardAssignment(linkRewardInput) || existingLinkReward
      ? await prisma.linkReward.upsert({
          where: {
            linkId: link.id,
          },
          create: {
            linkId: link.id,
            ...linkRewardInput,
          },
          update: {
            ...linkRewardInput,
          },
        })
      : null;

  if (
    hasRewardAssignment(linkRewardInput) &&
    !programEnrollment.groupMoveDisabledAt
  ) {
    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: link.partnerId,
          programId,
        },
      },
      data: {
        groupMoveDisabledAt: new Date(),
      },
    });
  }

  if (body.discountId !== undefined) {
    await syncDiscountCodes({
      programId,
      partnerId: link.partnerId,
    });
  }

  waitUntil(
    Promise.allSettled([
      linkCache.expireMany([link]),
      trackLinkRewardOverrideLog({
        workspaceId: workspace.id,
        programId,
        partnerId: link.partnerId,
        userId,
        description: activityDescription,
        previous: {
          clickRewardId: existingLinkReward?.clickRewardId ?? null,
          leadRewardId: existingLinkReward?.leadRewardId ?? null,
          saleRewardId: existingLinkReward?.saleRewardId ?? null,
          discountId: existingLinkReward?.discountId ?? null,
        },
        next: {
          clickRewardId: linkReward?.clickRewardId ?? null,
          leadRewardId: linkReward?.leadRewardId ?? null,
          saleRewardId: linkReward?.saleRewardId ?? null,
          discountId: linkReward?.discountId ?? null,
        },
        link,
      }),

      notifyPartnerRewardOverride({
        programId,
        partnerId: link.partnerId,
        previous: {
          clickRewardId: existingLinkReward?.clickRewardId ?? null,
          leadRewardId: existingLinkReward?.leadRewardId ?? null,
          saleRewardId: existingLinkReward?.saleRewardId ?? null,
        },
        next: {
          clickRewardId: linkReward?.clickRewardId ?? null,
          leadRewardId: linkReward?.leadRewardId ?? null,
          saleRewardId: linkReward?.saleRewardId ?? null,
        },
        groupRewardIds: {
          clickRewardId: partnerGroup?.clickRewardId ?? null,
          leadRewardId: partnerGroup?.leadRewardId ?? null,
          saleRewardId: partnerGroup?.saleRewardId ?? null,
        },
        activityDescription,
      }),
    ]),
  );

  return {
    ...link,
    ...toPartnerLinkRewardIdFields(linkReward),
  };
}
