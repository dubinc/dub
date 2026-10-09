import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  getRewardsQuerySchema,
  listRewards,
  listRewardsResponseSchema,
} from "@/lib/api/rewards/list-rewards";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/rewards - get all rewards for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getRewardsQuerySchema.parse(searchParams);

  const rewards = await listRewards({
    programId,
    groupId,
  });

  return NextResponse.json(listRewardsResponseSchema.parse(rewards));
});
