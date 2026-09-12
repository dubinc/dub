import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import {
  getRewardIds,
  hasRewardIdsInput,
  validateRewardIds,
} from "@/lib/api/rewards/link-rewards";
import { prisma } from "@/lib/prisma";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { getValue } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

type UpdatePartnerLinkParams = {
  workspaceId: string;
  programId: string;
  linkId: string;
} & z.infer<typeof updatePartnerLinkSchema>;

export async function updatePartnerLink({
  workspaceId,
  programId,
  linkId,
  ...body
}: UpdatePartnerLinkParams) {
  if (!hasRewardIdsInput(body)) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "At least one of clickRewardId, leadRewardId, saleRewardId, or discountId must be provided.",
    });
  }

  const link = await getLinkOrThrow({
    workspaceId,
    linkId,
  });

  if (link.programId !== programId || !link.partnerId) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner link not found.",
    });
  }

  const existingLinkReward = await prisma.linkReward.findUnique({
    where: {
      linkId: link.id,
    },
    select: {
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
    },
  });

  const linkRewardInput = {
    clickRewardId: getValue(
      body.clickRewardId,
      existingLinkReward?.clickRewardId ?? null,
    ),
    leadRewardId: getValue(
      body.leadRewardId,
      existingLinkReward?.leadRewardId ?? null,
    ),
    saleRewardId: getValue(
      body.saleRewardId,
      existingLinkReward?.saleRewardId ?? null,
    ),
    discountId: getValue(
      body.discountId,
      existingLinkReward?.discountId ?? null,
    ),
  };

  await validateRewardIds({
    programId,
    ...linkRewardInput,
  });

  const linkReward = await prisma.linkReward.upsert({
    where: {
      linkId: link.id,
    },
    create: {
      linkId: link.id,
      ...linkRewardInput,
    },
    update: linkRewardInput,
  });

  waitUntil(linkCache.expireMany([link]));

  return ProgramPartnerLinkSchema.parse({
    ...link,
    ...getRewardIds(linkReward),
  });
}
