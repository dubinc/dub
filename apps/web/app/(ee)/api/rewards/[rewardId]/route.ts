import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/rewards/[rewardId] - get a reward by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const reward = await getRewardOrThrow({
    rewardId: params.rewardId,
    programId,
  });

  return NextResponse.json(reward);
});
