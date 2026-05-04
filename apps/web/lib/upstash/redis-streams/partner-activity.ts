import { redis } from "../redis";
import { RedisStream } from "./client";

/* Partner Stats Stream */
const PARTNER_ACTIVITY_STREAM_KEY = "partner:activity:updates";

export const partnerActivityStream = new RedisStream(
  PARTNER_ACTIVITY_STREAM_KEY,
);

export interface PartnerActivityEvent {
  programId: string;
  partnerId: string;
  timestamp: string;
  eventType: "click" | "lead" | "sale" | "commission";
}

// Publishes a partner activity event to the stream
export const publishPartnerActivityEvent = async (
  event: PartnerActivityEvent,
) => {
  const { programId, partnerId, timestamp, eventType } = event;
  try {
    return await redis.xadd(PARTNER_ACTIVITY_STREAM_KEY, "*", {
      programId,
      partnerId,
      timestamp,
      eventType,
    });
  } catch (error) {
    console.error("Failed to publish partner activity event to stream:", error);
    throw error;
  }
};
