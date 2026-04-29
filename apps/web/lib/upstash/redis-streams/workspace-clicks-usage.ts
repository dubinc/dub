import { redis } from "../redis";
import { RedisStream } from "./client";

/* Workspace Clicks Usage Stream */
const WORKSPACE_CLICKS_USAGE_UPDATES_STREAM_KEY = "workspace:usage:updates";

export const workspaceClicksUsageStream = new RedisStream(
  WORKSPACE_CLICKS_USAGE_UPDATES_STREAM_KEY,
);

export interface WorkspaceClicksUsageEvent {
  linkId: string;
  workspaceId: string;
  timestamp: string;
}
// Publishes a click event to any relevant streams in a single transaction
export const publishWorkspaceClicksUsageEvent = async (
  event: WorkspaceClicksUsageEvent,
) => {
  const { linkId, workspaceId, timestamp } = event;
  try {
    return await redis.xadd(WORKSPACE_CLICKS_USAGE_UPDATES_STREAM_KEY, "*", {
      linkId,
      workspaceId,
      timestamp,
    });
  } catch (error) {
    console.error("Failed to publish workspace clicks usage event:", error);
    throw error;
  }
};
