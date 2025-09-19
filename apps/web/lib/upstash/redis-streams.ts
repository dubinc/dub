import { redis } from "./redis";

export interface ClickUpdateEvent {
  linkId: string;
  timestamp: number;
  count?: number;
}

export interface ProjectUsageUpdateEvent {
  projectId: string;
  timestamp: number;
  usageCount?: number;
  clickCount?: number;
}

export interface StreamEntry {
  id: string;
  linkId: string;
  timestamp: string;
  count: string;
}

export interface ProjectStreamEntry {
  id: string;
  projectId: string;
  timestamp: string;
  usageCount: string;
  clickCount: string;
}

export interface ProcessedClickUpdate {
  linkId: string;
  totalCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface ProcessedProjectUpdate {
  projectId: string;
  totalUsage: number;
  totalClicks: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

export class RedisStream {
  private streamKey: string;

  constructor(streamKey: string = "click-updates") {
    this.streamKey = streamKey;
  }

  /**
   * Publish a click update event to the stream
   * This method is optimized for high-frequency writes (10+ times per second)
   */
  async publishClickUpdate(event: ClickUpdateEvent): Promise<string> {
    try {
      // Use "*" to auto-generate stream ID for optimal performance
      const streamId = await redis.xadd(this.streamKey, "*", {
        linkId: event.linkId,
        timestamp: event.timestamp.toString(),
        count: (event.count || 1).toString(),
      });

      return streamId;
    } catch (error) {
      console.error("Failed to publish click update to stream:", error);
      throw error;
    }
  }

  /**
   * Publish a project usage update event to the stream
   * This method is optimized for high-frequency writes (10+ times per second)
   */
  async publishProjectUsageUpdate(
    event: ProjectUsageUpdateEvent,
  ): Promise<string> {
    try {
      // Use "*" to auto-generate stream ID for optimal performance
      const streamId = await redis.xadd(this.streamKey, "*", {
        projectId: event.projectId,
        timestamp: event.timestamp.toString(),
        usageCount: (event.usageCount || 0).toString(),
        clickCount: (event.clickCount || 0).toString(),
      });

      return streamId;
    } catch (error) {
      console.error("Failed to publish project usage update to stream:", error);
      throw error;
    }
  }

  /**
   * Read and process click updates from the stream
   * This method aggregates clicks by linkId and returns the total counts
   */
  async readAndProcessUpdates(
    options: {
      startId?: string;
      endId?: string;
      count?: number;
      deleteAfterRead?: boolean;
    } = {},
  ): Promise<{
    updates: ProcessedClickUpdate[];
    lastProcessedId: string | null;
  }> {
    const {
      startId = "0",
      endId = "+",
      count = 1000,
      deleteAfterRead = true,
    } = options;

    try {
      // Read entries from the stream
      const entries = await redis.xrange(this.streamKey, startId, endId, count);

      if (!entries || Object.keys(entries).length === 0) {
        return { updates: [], lastProcessedId: null };
      }

      // Aggregate clicks by linkId
      const aggregatedClicks = new Map<string, ProcessedClickUpdate>();
      let lastId: string | null = null;

      for (const [streamId, fields] of Object.entries(entries)) {
        const entry = fields as unknown as {
          linkId: string;
          timestamp: string;
          count: string;
        };
        const linkId = entry.linkId;
        const timestamp = parseInt(entry.timestamp);
        const count = parseInt(entry.count);

        lastId = streamId;

        if (aggregatedClicks.has(linkId)) {
          const existing = aggregatedClicks.get(linkId)!;
          existing.totalCount += count;
          existing.lastTimestamp = Math.max(existing.lastTimestamp, timestamp);
          existing.firstTimestamp = Math.min(
            existing.firstTimestamp,
            timestamp,
          );
        } else {
          aggregatedClicks.set(linkId, {
            linkId,
            totalCount: count,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
          });
        }
      }

      // Optionally delete processed entries to prevent memory buildup
      if (deleteAfterRead && lastId) {
        try {
          // Remove entries up to the last processed ID
          // We'll implement this by deleting all entries older than the last processed one
          // For now, we'll keep a maximum number of entries to prevent unbounded growth
          const allEntries = await redis.xrange(this.streamKey, "-", "+");
          const totalEntries = Object.keys(allEntries || {}).length;

          // Keep only the last 1000 entries if we have more than 2000
          if (totalEntries > 2000) {
            const entryIds = Object.keys(allEntries);
            const keepFromIndex = totalEntries - 1000;
            const minIdToKeep = entryIds[keepFromIndex];

            // Delete entries older than minIdToKeep (this is a workaround for xtrim)
            for (let i = 0; i < keepFromIndex; i++) {
              try {
                await redis.xdel(this.streamKey, entryIds[i]);
              } catch (delError) {
                // Continue if individual delete fails
              }
            }
          }
        } catch (error) {
          console.warn("Failed to clean up stream entries:", error);
          // Don't throw - this is not critical
        }
      }

      return {
        updates: Array.from(aggregatedClicks.values()),
        lastProcessedId: lastId,
      };
    } catch (error) {
      console.error("Failed to read updates from stream:", error);
      throw error;
    }
  }

  /**
   * Read and process project usage updates from the stream
   * This method aggregates usage and clicks by projectId and returns the total counts
   */
  async readAndProcessProjectUpdates(
    options: {
      startId?: string;
      endId?: string;
      count?: number;
      deleteAfterRead?: boolean;
    } = {},
  ): Promise<{
    updates: ProcessedProjectUpdate[];
    lastProcessedId: string | null;
  }> {
    const {
      startId = "0",
      endId = "+",
      count = 1000,
      deleteAfterRead = true,
    } = options;

    try {
      // Read entries from the stream
      const entries = await redis.xrange(this.streamKey, startId, endId, count);

      if (!entries || Object.keys(entries).length === 0) {
        return { updates: [], lastProcessedId: null };
      }

      // Aggregate usage by projectId
      const aggregatedUsage = new Map<string, ProcessedProjectUpdate>();
      let lastId: string | null = null;

      for (const [streamId, fields] of Object.entries(entries)) {
        const entry = fields as unknown as {
          projectId: string;
          timestamp: string;
          usageCount: string;
          clickCount: string;
        };
        const projectId = entry.projectId;
        const timestamp = parseInt(entry.timestamp);
        const usageCount = parseInt(entry.usageCount);
        const clickCount = parseInt(entry.clickCount);

        lastId = streamId;

        if (aggregatedUsage.has(projectId)) {
          const existing = aggregatedUsage.get(projectId)!;
          existing.totalUsage += usageCount;
          existing.totalClicks += clickCount;
          existing.lastTimestamp = Math.max(existing.lastTimestamp, timestamp);
          existing.firstTimestamp = Math.min(
            existing.firstTimestamp,
            timestamp,
          );
        } else {
          aggregatedUsage.set(projectId, {
            projectId,
            totalUsage: usageCount,
            totalClicks: clickCount,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
          });
        }
      }

      // Optionally delete processed entries to prevent memory buildup
      if (deleteAfterRead && lastId) {
        try {
          // Remove entries up to the last processed ID
          // We'll implement this by deleting all entries older than the last processed one
          // For now, we'll keep a maximum number of entries to prevent unbounded growth
          const allEntries = await redis.xrange(this.streamKey, "-", "+");
          const totalEntries = Object.keys(allEntries || {}).length;

          // Keep only the last 1000 entries if we have more than 2000
          if (totalEntries > 2000) {
            const entryIds = Object.keys(allEntries);
            const keepFromIndex = totalEntries - 1000;
            const minIdToKeep = entryIds[keepFromIndex];

            // Delete entries older than minIdToKeep (this is a workaround for xtrim)
            for (let i = 0; i < keepFromIndex; i++) {
              try {
                await redis.xdel(this.streamKey, entryIds[i]);
              } catch (delError) {
                // Continue if individual delete fails
              }
            }
          }
        } catch (error) {
          console.warn("Failed to clean up stream entries:", error);
          // Don't throw - this is not critical
        }
      }

      return {
        updates: Array.from(aggregatedUsage.values()),
        lastProcessedId: lastId,
      };
    } catch (error) {
      console.error("Failed to read project usage updates from stream:", error);
      throw error;
    }
  }

  /**
   * Get stream information (length, first/last entry, etc.)
   */
  async getStreamInfo(): Promise<{
    length: number;
    firstEntryId: string | null;
    lastEntryId: string | null;
  }> {
    try {
      // Get stream length - check if stream exists first
      let length = 0;
      let firstEntryId: string | null = null;
      let lastEntryId: string | null = null;

      try {
        // Try to get first entry to check if stream exists
        const firstEntry = await redis.xrange(this.streamKey, "-", "+", 1);

        if (firstEntry && Object.keys(firstEntry).length > 0) {
          firstEntryId = Object.keys(firstEntry)[0];

          // If stream exists, get its length and last entry
          const entries = await redis.xrange(this.streamKey, "-", "+");
          length = Object.keys(entries || {}).length;

          if (length > 0) {
            const lastEntry = await redis.xrange(this.streamKey, "+", "+", 1);
            if (lastEntry && Object.keys(lastEntry).length > 0) {
              lastEntryId = Object.keys(lastEntry)[0];
            }
          }
        }
      } catch (streamError) {
        // Stream might not exist yet, which is fine
        console.log("Stream does not exist or is empty:", streamError);
      }

      return {
        length,
        firstEntryId,
        lastEntryId,
      };
    } catch (error) {
      console.error("Failed to get stream info:", error);
      throw error;
    }
  }

  /**
   * Clear all entries from the stream (use with caution!)
   */
  async clearStream(): Promise<void> {
    try {
      await redis.del(this.streamKey);
    } catch (error) {
      console.error("Failed to clear stream:", error);
      throw error;
    }
  }
}

// Export instances for both click and project usage updates
export const clickUpdatesStream = new RedisStream("link-click-updates");
export const projectUsageStream = new RedisStream("project-usage-updates");
