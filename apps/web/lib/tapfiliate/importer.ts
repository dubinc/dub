import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { tapfiliateImportPayloadSchema } from "./schemas";
import { TapfiliateCredentials } from "./types";

export const TAPFILIATE_MAX_BATCHES = 20;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "tapfiliate:import";

class TapfiliateImporter {
  async setCredentials(
    workspaceId: string,
    credentials: TapfiliateCredentials,
  ) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, credentials, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string) {
    const credentials = await redis.get<TapfiliateCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!credentials) {
      throw new Error("Tapfiliate credentials not found.");
    }

    return credentials;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(
    body: z.infer<typeof tapfiliateImportPayloadSchema>,
    options?: { delay?: number },
  ) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/tapfiliate`,
      body,
      contentBasedDeduplication: true,
      ...(options?.delay != null && { delay: options.delay }),
    });
  }
}

export const tapfiliateImporter = new TapfiliateImporter();
