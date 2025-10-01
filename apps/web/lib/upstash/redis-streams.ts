import { redis } from "./redis";

// Stream key constants
export const LINK_CLICK_UPDATES_STREAM_KEY = "link:click:updates";
export const PROJECT_USAGE_UPDATES_STREAM_KEY = "project:usage:updates";

export interface ClickEvent {
  linkId: string;
  timestamp: string;
  url?: string;
}

export interface StreamEntry {
  id: string;
  linkId: string;
  timestamp: string;
}

export interface ProjectStreamEntry {
  id: string;
  linkId: string;
  timestamp: string;
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

  constructor(streamKey: string) {
    this.streamKey = streamKey;
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
        };
        const linkId = entry.linkId;
        const timestamp = Date.parse(entry.timestamp) / 1000;
        const count = 1;

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
      // xackdel is not a standard Redis command, but if you are referring to a custom helper or a pattern
      // that acknowledges and deletes entries in a consumer group (as with xack + xdel), you could use it
      // if you are using consumer groups. However, this code is not using consumer groups, so xdel is correct.
      // If you want to use xackdel, you must be using XREADGROUP and have a consumer group context.
      // For now, keep xdel, but add a note:

      if (deleteAfterRead && lastId) {
        try {
          // NOTE: If using Redis Streams with consumer groups, you should use XACK to acknowledge
          // entries for a group/consumer, and optionally XDEL to delete. Here, we are not using consumer groups,
          // so we just delete processed entries directly.
          // If you migrate to consumer groups, replace this with xack + xdel as appropriate.

          // Remove all processed entries up to and including lastId
          // Get all entry IDs up to lastId
          const processedEntries = await redis.xrange(
            this.streamKey,
            "-",
            lastId,
          );
          const processedEntryIds = Object.keys(processedEntries || {});
          if (processedEntryIds.length > 0) {
            // xdel supports deleting multiple IDs at once, but Upstash limits batch size, so chunk if needed
            const BATCH_SIZE = 100;
            for (let i = 0; i < processedEntryIds.length; i += BATCH_SIZE) {
              const batch = processedEntryIds.slice(i, i + BATCH_SIZE);
              try {
                await redis.xdel(this.streamKey, batch);
              } catch (delError) {
                // Continue if individual batch delete fails
              }
            }
          }

          // Additionally, trim the stream to prevent unbounded growth
          // Keep only the last 2000 entries (soft limit)
          try {
            // Upstash/Redis xtrim expects an options object, not just a number
            await redis.xtrim(this.streamKey, {
              strategy: "MAXLEN",
              threshold: 2000,
              exactness: "~",
            });
          } catch (trimError) {
            // Not critical if trim fails
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
        const timestamp = Date.parse(entry.timestamp) / 1000;
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
            // Use "$" to get the last entry instead of "+"
            const lastEntry = await redis.xrevrange(
              this.streamKey,
              "+",
              "-",
              1,
            );

            if (lastEntry && Object.keys(lastEntry).length > 0) {
              const entryId = Object.keys(lastEntry)[0];

              if (entryId !== firstEntryId) {
                lastEntryId = entryId;
              }
            }
          }
        }
      } catch (streamError) {
        // Stream might not exist yet, which is fine
        console.log("Stream does not exist or is empty:", streamError);
        console.log(streamError.message);
        console.log(streamError.type);
        console.log(JSON.stringify(streamError, null, 2));
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
}

// Export instances for both click and project usage updates
export const clickUpdatesStream = new RedisStream(
  LINK_CLICK_UPDATES_STREAM_KEY,
);
export const projectUsageStream = new RedisStream(
  PROJECT_USAGE_UPDATES_STREAM_KEY,
);

export const publishLinkClick = async (event: ClickEvent) => {
  const { linkId, timestamp, url } = event;
  const entry = { linkId, timestamp };

  try {
    const pipeline = redis.pipeline();

    pipeline.xadd(LINK_CLICK_UPDATES_STREAM_KEY, "*", entry);

    if (url) {
      pipeline.xadd(PROJECT_USAGE_UPDATES_STREAM_KEY, "*", entry);
    }

    return await pipeline.exec();
  } catch (error) {
    console.error("Failed to publish click update to streams:", error);
    throw error;
  }
};
