import { trackLinkRewardOverrideLog } from "@/lib/api/activity-log/track-reward-overrides";
import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { notifyPartnerRewardOverride } from "@/lib/api/partners/notify-partner-reward-change";
import {
  getRewardIds,
  hasRewardIdsInput,
  throwIfInvalidRewardIds,
} from "@/lib/api/rewards/additional-rewards";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_AND_LINK_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { WorkspaceProps } from "@/lib/types";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { getValue } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

type UpdatePartnerLinkParams = {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  programId: string;
  linkId: string;
  userId: string;
} & z.infer<typeof updatePartnerLinkSchema>;

const omitGroupDefault = (
  value: string | null,
  groupDefaultId: string | null | undefined,
) => (value && value === groupDefaultId ? null : value);

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

  if (!getPlanCapabilities(workspace.plan).canUseAdvancedRewardLogic) {
    throw new DubApiError({
      code: "forbidden",
      message: PARTNER_AND_LINK_REWARDS_PLAN_ERROR,
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

  // Group defaults are inherited; only persist real link-level overrides.
  const linkRewardInput = {
    clickRewardId: omitGroupDefault(
      getValue(body.clickRewardId, existingLinkReward?.clickRewardId ?? null),
      partnerGroup?.clickRewardId,
    ),
    leadRewardId: omitGroupDefault(
      getValue(body.leadRewardId, existingLinkReward?.leadRewardId ?? null),
      partnerGroup?.leadRewardId,
    ),
    saleRewardId: omitGroupDefault(
      getValue(body.saleRewardId, existingLinkReward?.saleRewardId ?? null),
      partnerGroup?.saleRewardId,
    ),
    discountId: omitGroupDefault(
      getValue(body.discountId, existingLinkReward?.discountId ?? null),
      partnerGroup?.discountId,
    ),
  };

  await throwIfInvalidRewardIds({
    programId,
    groupId: programEnrollment.groupId,
    ...linkRewardInput,
  });

  const hasLinkOverride =
    linkRewardInput.clickRewardId ||
    linkRewardInput.leadRewardId ||
    linkRewardInput.saleRewardId ||
    linkRewardInput.discountId;

  const linkReward =
    hasLinkOverride || existingLinkReward
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

  return ProgramPartnerLinkSchema.parse({
    ...link,
    ...getRewardIds(linkReward),
  });
}
