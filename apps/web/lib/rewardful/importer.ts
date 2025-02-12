import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { RewardfulConfig } from "./types";

export const MAX_BATCHES = 5;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "rewardful:import";
export const ImportSteps = z.enum(["import-affiliates", "import-referrals"]);

class RewardfulImporter {
  async setCredentials({
    programId,
    userId,
    token,
  }: RewardfulConfig & { programId: string }) {
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

  async getCredentials(programId: string): Promise<RewardfulConfig> {
    const config = await redis.get<RewardfulConfig>(
      `${CACHE_KEY_PREFIX}:${programId}`,
    );

    if (!config) {
      throw new Error("Rewardful configuration not found.");
    }

    return config;
  }

  async deleteCredentials(programId: string) {
    await redis.del(`${CACHE_KEY_PREFIX}:${programId}`);
  }

  async queue(body: {
    programId: string;
    action?: z.infer<typeof ImportSteps>;
    page?: number;
  }) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rewardful`,
      body,
    });
  }
}

export const rewardfulImporter = new RewardfulImporter();
