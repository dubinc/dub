import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
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

  const discounts = await prisma.discount.findMany({
    where: {
      groupId: group.id,
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    // Soft delete rewards
    await tx.reward.updateMany({
      where: {
        groupId: group.id,
      },
      data: {
        programId: null,
        groupId: null,
      },
    });

    // Soft delete discounts (orphaned cleanup cron hard-deletes after remapping)
    await tx.discount.updateMany({
      where: {
        groupId: group.id,
      },
      data: {
        programId: null,
        groupId: null,
      },
    });

    // Soft delete default links so Link.partnerGroupDefaultLinkId stays set
    // for in-flight remap after partners were moved out of this group
    await tx.partnerGroupDefaultLink.updateMany({
      where: {
        groupId: group.id,
      },
      data: {
        groupId: null,
      },
    });

    // Delete group move workflow
    if (group.workflowId) {
      await tx.workflow.delete({
        where: {
          id: group.workflowId,
        },
      });
    }

    // Only delete when no enrollments still reference this group
    const { count } = await tx.partnerGroup.deleteMany({
      where: {
        id: group.id,
        partners: {
          none: {},
        },
      },
    });

    if (count === 0) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You cannot delete a group that still has partners. Move them to another group first.",
      });
    }
  });

  // An empty group (no enrollments with this `groupId`)
  // can still own discount rows referenced by codes/enrollments/LinkReward
  // for partners who already moved if remaps are in-flight
  if (discounts.length > 0) {
    await dispatchWorkflows(
      discounts.map((discount) => ({
        name: "detach-discount-workflow" as const,
        payload: {
          programId: group.programId,
          discountId: discount.id,
        },
        options: {
          label: discount.id,
        },
      })),
    );
  }

  waitUntil(
    removeGroupIdFromMoveRules({
      programId: group.programId,
      groupId: group.id,
    }),
  );
}
