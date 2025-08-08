import { qstash } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { toltImportPayloadSchema } from "./schemas";
import { ToltCredentials } from "./types";

export const MAX_BATCHES = 5;
export const CACHE_EXPIRY = 60 * 60 * 24;
export const CACHE_KEY_PREFIX = "tolt:import";
export const PARTNER_IDS_KEY_PREFIX = "tolt:import:partnerIds";

class ToltImporter {
  async setCredentials(workspaceId: string, credentials: ToltCredentials) {
    await redis.set(`${CACHE_KEY_PREFIX}:${workspaceId}`, credentials, {
      ex: CACHE_EXPIRY,
    });
  }

  async getCredentials(workspaceId: string) {
    const config = await redis.get<ToltCredentials>(
      `${CACHE_KEY_PREFIX}:${workspaceId}`,
    );

    if (!config) {
      throw new Error("Tolt configuration not found.");
    }

    return config;
  }

  async deleteCredentials(workspaceId: string) {
    return await redis.del(`${CACHE_KEY_PREFIX}:${workspaceId}`);
  }

  async queue(body: z.infer<typeof toltImportPayloadSchema>) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/tolt`,
      body,
    });
  }

  async addPartners({
    programId,
    partnerIds,
  }: {
    programId: string;
    partnerIds: string[];
  }) {
    if (!partnerIds || partnerIds.length === 0) {
      return;
    }

    await redis.lpush(`${PARTNER_IDS_KEY_PREFIX}:${programId}`, ...partnerIds);
  }

  async scanPartnerIds({
    programId,
    start,
    end,
  }: {
    programId: string;
    start: number;
    end: number;
  }) {
    return await redis.lrange(
      `${PARTNER_IDS_KEY_PREFIX}:${programId}`,
      start,
      end,
    );
  }

  async deletePartnerIds(programId: string) {
    return await redis.del(`${PARTNER_IDS_KEY_PREFIX}:${programId}`);
  }
}

export const toltImporter = new ToltImporter();
