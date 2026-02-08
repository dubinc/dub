import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { RewardfulCredentials, RewardfulImportPayload } from "./types";

// Rewardful rate limit is 45 requests per 30 seconds
// so we should be able to safely request up to 10 batches at a time
export const MAX_BATCHES = 10;

// cache rewardful credentials for 24 hours
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "rewardful:import";

class RewardfulImporter {
  async setCredentials(workspaceId: string, payload: RewardfulCredentials) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, payload, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string): Promise<RewardfulCredentials> {
    const config = await redis.get<RewardfulCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!config) {
      throw new Error("Rewardful configuration not found.");
    }

    return config;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(body: RewardfulImportPayload) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/rewardful`,
      body,
    });
  }
}

export const rewardfulImporter = new RewardfulImporter();
