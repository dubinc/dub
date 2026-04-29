import { conn } from "@/lib/planetscale";
import { redis } from "../redis";
import { RedisStream } from "./client";

/* Workspace Links Usage Stream */
const WORKSPACE_LINKS_USAGE_UPDATES_STREAM_KEY = "workspace:linksUsage:updates";

export const workspaceLinksUsageStream = new RedisStream(
  WORKSPACE_LINKS_USAGE_UPDATES_STREAM_KEY,
);

export interface WorkspaceLinksUsageEvent {
  workspaceId: string;
  linksCount: number;
  timestamp: string;
}

export const publishWorkspaceLinksUsageEvent = async (
  event: WorkspaceLinksUsageEvent,
) => {
  const { workspaceId, linksCount, timestamp } = event;

  try {
    return await redis.xadd(WORKSPACE_LINKS_USAGE_UPDATES_STREAM_KEY, "*", {
      workspaceId,
      linksCount,
      timestamp,
    });
  } catch (error) {
    console.error(
      "Failed to publish workspace links usage event (falling back to database update):",
      error,
    );
    // fallback on writing directly to the database
    return await conn.execute(
      "UPDATE Project SET linksUsage = linksUsage + ?, totalLinks = totalLinks + ? WHERE id = ?",
      [linksCount, linksCount, workspaceId],
    );
  }
};
