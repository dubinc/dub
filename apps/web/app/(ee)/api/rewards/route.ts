import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRewardsQuerySchema, RewardSchema } from "@/lib/zod/schemas/rewards";
import { EventType } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const ENROLLMENT_COUNT_BY_EVENT = {
  [EventType.click]: "clickEnrollments",
  [EventType.lead]: "leadEnrollments",
  [EventType.sale]: "saleEnrollments",
  [EventType.referral]: "referralEnrollments",
  [EventType.custom]: "customEnrollments",
} as const;

// GET /api/rewards - get all rewards for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getRewardsQuerySchema.parse(searchParams);

  const rewards = await prisma.reward.findMany({
    where: {
      programId,
      ...(groupId && { groupId }),
    },
    include: {
      _count: {
        select: {
          clickEnrollments: true,
          leadEnrollments: true,
          saleEnrollments: true,
          referralEnrollments: true,
          customEnrollments: true,
        },
      },
    },
    orderBy: [
      {
        event: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const rewardsWithPartnersCount = rewards.map((reward) => {
    const countKey = ENROLLMENT_COUNT_BY_EVENT[reward.event];
    const { _count, ...rest } = reward;

    return {
      ...rest,
      partnersCount: _count[countKey],
    };
  });

  return NextResponse.json(
    z
      .array(
        RewardSchema.extend({
          groupId: z.string().nullable(),
          partnersCount: z.number(),
        }),
      )
      .parse(rewardsWithPartnersCount),
  );
});
