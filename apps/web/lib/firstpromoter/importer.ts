import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { FirstPromoterCredentials, FirstPromoterImportPayload } from "./types";

export const PAGE_LIMIT = 100;
export const MAX_BATCHES = 10;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "firstpromoter:import";

class FirstPromoterImporter {
  async setCredentials(workspaceId: string, payload: FirstPromoterCredentials) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, payload, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string): Promise<FirstPromoterCredentials> {
    const config = await redis.get<FirstPromoterCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!config) {
      throw new Error("FirstPromoter configuration not found.");
    }

    return config;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(body: FirstPromoterImportPayload) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/firstpromoter`,
      body,
    });
  }
}

export const firstPromoterImporter = new FirstPromoterImporter();
