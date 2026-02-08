import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { partnerStackImportPayloadSchema } from "./schemas";
import { PartnerStackCredentials } from "./types";

export const MAX_BATCHES = 5;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "partnerStack:import";
export const PARTNER_IDS_KEY_PREFIX = "partnerStack:import:partnerIds";

class PartnerStackImporter {
  async setCredentials(
    workspaceId: string,
    credentials: PartnerStackCredentials,
  ) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, credentials, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string) {
    const config = await redis.get<PartnerStackCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!config) {
      throw new Error("PartnerStack configuration not found.");
    }

    return config;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(body: z.infer<typeof partnerStackImportPayloadSchema>) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/partnerstack`,
      body,
    });
  }
}

export const partnerStackImporter = new PartnerStackImporter();
