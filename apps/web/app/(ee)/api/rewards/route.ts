import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { listRewards } from "@/lib/api/rewards/list-rewards";
import { withWorkspace } from "@/lib/auth";
import { getRewardsQuerySchema, RewardSchema } from "@/lib/zod/schemas/rewards";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const outputSchema = z.array(
  RewardSchema.extend({
    groupId: z.string().nullable(),
    partnersCount: z.number(),
  }),
);

// GET /api/rewards - get all rewards for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getRewardsQuerySchema.parse(searchParams);

  const rewards = await listRewards({
    programId,
    groupId,
  });

  return NextResponse.json(outputSchema.parse(rewards));
});
