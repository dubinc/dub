import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { LemonSqueezyCredentials, LemonSqueezyImportPayload } from "./types";

// Lemon Squeezy rate limit is 300 requests per minute
export const LEMONSQUEEZY_MAX_BATCHES = 10;

export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "lemonsqueezy:import";

class LemonSqueezyImporter {
  async setCredentials(
    workspaceId: string,
    credentials: LemonSqueezyCredentials,
  ) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, credentials, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string): Promise<LemonSqueezyCredentials> {
    const credentials = await redis.get<LemonSqueezyCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!credentials) {
      throw new Error(
        "Lemon Squeezy credentials not found. Please restart the import process.",
      );
    }

    return credentials;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(body: LemonSqueezyImportPayload, options?: { delay?: number }) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/lemonsqueezy`,
      body,
      contentBasedDeduplication: true,
      ...(options?.delay != null && { delay: options.delay }),
    });
  }
}

export const lemonSqueezyImporter = new LemonSqueezyImporter();
