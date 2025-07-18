"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  createRewardSchema,
  REWARD_EVENT_COLUMN_MAPPING,
} from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createRewardAction = authActionClient
  .schema(createRewardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let {
      event,
      amount,
      type,
      maxDuration,
      isDefault,
      includedPartnerIds,
      excludedPartnerIds,
    } = parsedInput;

    includedPartnerIds = includedPartnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Only one default reward is allowed for each event
    if (isDefault) {
      const defaultReward = await prisma.reward.findFirst({
        where: {
          programId,
          event,
          default: true,
        },
      });

      if (defaultReward) {
        throw new Error(
          `There is an existing default ${event} reward already. A program can only have one ${event} default reward.`,
        );
      }
    }

    const finalPartnerIds = [...includedPartnerIds, ...excludedPartnerIds];

    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: finalPartnerIds,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const invalidPartnerIds = finalPartnerIds.filter(
        (id) =>
          !programEnrollments.some((enrollment) => enrollment.partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided (partners must be enrolled in the program): ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId,
        event,
        type,
        amount,
        maxDuration,
        default: isDefault,
      },
    });

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        ...(reward.default
          ? {
              [rewardIdColumn]: null,
              ...(excludedPartnerIds.length > 0 && {
                partnerId: {
                  notIn: excludedPartnerIds,
                },
              }),
            }
          : {
              partnerId: {
                in: includedPartnerIds,
              },
            }),
      },
      data: {
        [rewardIdColumn]: reward.id,
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "reward.created",
        description: `Reward ${reward.id} created`,
        actor: user,
        targets: [
          {
            type: "reward",
            id: reward.id,
            metadata: reward,
          },
        ],
      }),
    );
  });
