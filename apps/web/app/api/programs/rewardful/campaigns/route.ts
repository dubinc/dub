import { withSession } from "@/lib/auth";
import { RewardfulApi } from "@/lib/rewardful/api";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
});

// GET /api/programs/rewardful/campaigns - list rewardful campaigns
export const GET = withSession(async ({ searchParams }) => {
  const { token } = schema.parse(searchParams);

  const rewardfulApi = new RewardfulApi({ token });

  return NextResponse.json(await rewardfulApi.listCampaigns());
});
