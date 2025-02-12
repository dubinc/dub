import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { RewardfulApi } from "./api";
import { RewardfulConfig } from "./types";

export const MAX_BATCHES = 5;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "rewardful:import";
export const ImportSteps = z.enum(["import-affiliates", "import-referrals"]);

export async function setRewardfulConfig({
  programId,
  userId,
  token,
}: {
  programId: string;
  userId: string;
  token: string;
}) {
  await redis.set(
    `${CACHE_KEY_PREFIX}:${programId}`,
    {
      token,
      userId,
    },
    {
      ex: CACHE_EXPIRY,
    },
  );
}

export async function fetchRewardfulConfig(programId: string) {
  const config = await redis.get<RewardfulConfig>(
    `${CACHE_KEY_PREFIX}:${programId}`,
  );

  if (!config) {
    throw new Error("Rewardful config not found.");
  }

  return config;
}

export async function queueRewardfulImport(body: {
  programId: string;
  campaignId: string;
  action?: z.infer<typeof ImportSteps>;
  page?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rewardful`,
    body,
  });
}

export function createRewardfulApi(programId: string) {
  return new RewardfulApi({ programId });
}
