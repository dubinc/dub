import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { PartnerGroup } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { removeGroupIdFromMoveRules } from "./remove-group-id-from-move-rules";

// Delete a partner group. You can't delete a group that still has partners.
export async function deletePartnerGroup(
  group: Pick<
    PartnerGroup,
    | "id"
    | "slug"
    | "name"
    | "clickRewardId"
    | "leadRewardId"
    | "saleRewardId"
    | "referralRewardId"
    | "customRewardId"
    | "discountId"
    | "workflowId"
    | "programId"
  >,
) {
  if (group.slug === DEFAULT_PARTNER_GROUP.slug) {
    throw new DubApiError({
      code: "forbidden",
      message: "You cannot delete the default group of your program.",
    });
  }

  const enrollment = await prisma.programEnrollment.findFirst({
    where: {
      groupId: group.id,
    },
    select: {
      id: true,
    },
    take: 1,
  });

  if (enrollment) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You cannot delete a group that still has partners. Move them to another group first.",
    });
  }

  await prisma.$transaction([
    // Soft delete rewards
    prisma.reward.updateMany({
      where: {
        groupId: group.id,
      },
      data: {
        programId: null,
      },
    }),

    // Delete discounts
    prisma.discount.deleteMany({
      where: {
        groupId: group.id,
      },
    }),

    // Delete group move workflow
    ...(group.workflowId
      ? [
          prisma.workflow.delete({
            where: {
              id: group.workflowId,
            },
          }),
        ]
      : []),

    // Delete the group
    prisma.partnerGroup.delete({
      where: {
        id: group.id,
      },
    }),
  ]);

  waitUntil(
    removeGroupIdFromMoveRules({
      programId: group.programId,
      groupId: group.id,
    }),
  );
}
