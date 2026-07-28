import { logger, toErrorFields } from "@/lib/axiom/server";
import { conn } from "@/lib/planetscale";
import { redis } from "../redis";
import { RedisStream } from "./client";

const CLICK_STATS_STREAM_KEY = "click:stats:updates";

export const clickStatsStream = new RedisStream(CLICK_STATS_STREAM_KEY);

export interface ClickStatsEvent {
  linkId: string;
  timestamp: string;
  workspaceId?: string;
  programId?: string;
  partnerId?: string;
}

export const publishClickStatsEvent = async ({
  linkId,
  timestamp,
  workspaceId,
  programId,
  partnerId,
}: ClickStatsEvent) => {
  const payload = {
    linkId,
    timestamp,
    ...(workspaceId && { workspaceId }),
    ...(programId && partnerId && { programId, partnerId }),
  };

  try {
    return await redis.xadd(CLICK_STATS_STREAM_KEY, "*", payload);
  } catch (error) {
    logger.error("stream.publish_failed", {
      service: "upstash",
      streamKey: CLICK_STATS_STREAM_KEY,
      error: toErrorFields(error),
      correlation: {
        linkId,
        workspaceId,
        programId,
        partnerId,
      },
    });

    return await Promise.allSettled([
      conn.execute(
        "UPDATE Link SET clicks = clicks + 1, lastClicked = NOW() WHERE id = ?",
        [linkId],
      ),

      workspaceId
        ? conn.execute(
            "UPDATE Project p SET p.usage = p.usage + 1, p.totalClicks = p.totalClicks + 1 WHERE id = ?",
            [workspaceId],
          )
        : null,

      programId && partnerId
        ? conn.execute(
            "UPDATE ProgramEnrollment SET totalClicks = totalClicks + 1 WHERE programId = ? AND partnerId = ?",
            [programId, partnerId],
          )
        : null,

      logger.flush(),
    ]);
  }
};
