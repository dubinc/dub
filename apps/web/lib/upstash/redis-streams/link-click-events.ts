import { logger, toErrorFields } from "@/lib/axiom/server";
import { conn } from "@/lib/planetscale";
import { redis } from "../redis";
import { RedisStream } from "./client";

const STREAM_KEY = "link:click:events";

export const linkClickEventStream = new RedisStream(STREAM_KEY);

export interface LinkClickEvent {
  linkId: string;
  timestamp: string;
  workspaceId?: string;
  programId?: string;
  partnerId?: string;
}

// Publishes a link click event to the stream to update:
// - link clicks count + lastClicked timestamp
// - workspace usage + totalClicks
// - program enrollment totalClicks
export const publishLinkClickEvent = async ({
  linkId,
  timestamp,
  workspaceId,
  programId,
  partnerId,
}: LinkClickEvent) => {
  const payload = {
    linkId,
    timestamp,
    ...(workspaceId && { workspaceId }),
    ...(programId && partnerId && { programId, partnerId }),
  };

  try {
    return await redis.xadd(STREAM_KEY, "*", payload);
  } catch (error) {
    logger.error("stream.publish_failed", {
      service: "upstash",
      streamKey: STREAM_KEY,
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
            "UPDATE Project SET usage = usage + 1, totalClicks = totalClicks + 1 WHERE id = ?",
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
