import { redis } from "./redis";

// Stream key constants
export const WORKSPACE_USAGE_UPDATES_STREAM_KEY = "workspace:usage:updates";

export interface ClickEvent {
  linkId: string;
  workspaceId: string;
  timestamp: string;
}

export type RedisStreamEntry<T> = {
  id: string;
  data: T;
};

export class RedisStream {
  private streamKey: string;

  constructor(streamKey: string) {
    this.streamKey = streamKey;
  }

  /**
   * Read and process a batch of items from the stream
   * This provides a consumable batch of messages with the ability to delete them upon successful completion of the handler
   */
  async processBatch<T>(
    handler: (
      records: RedisStreamEntry<T>[],
    ) => Promise<any & { processedEntryIds: string[] }>,
    options: {
      startId?: string;
      endId?: string;
      count?: number;
      deleteAfterRead?: boolean;
    } = {},
  ): Promise<any> {
    const {
      startId = "0",
      endId = "+",
      count = 1000,
      deleteAfterRead = true,
    } = options;

    try {
      // Read entries from the stream
      const entriesMap = await redis.xrange(
        this.streamKey,
        startId,
        endId,
        count,
      );

      const entries: RedisStreamEntry<T>[] = Object.entries(entriesMap).map(
        ([id, data]) => ({
          id,
          data: data as any,
        }),
      );

      const { processedEntryIds, ...response } = await handler(entries);

      // Optionally delete processed entries to prevent memory buildup
      if (deleteAfterRead) {
        try {
          if (processedEntryIds.length > 0) {
            // xdel supports deleting multiple IDs at once
            await redis.xdel(this.streamKey, processedEntryIds);
          }
        } catch (error) {
          console.warn("Failed to clean up processed stream entries:", error);
          // Don't throw - this is not critical
        }
      }

      return response as Response;
    } catch (error) {
      console.error(
        "Failed to read workspace usage updates from stream:",
        error,
      );
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

export const workspaceUsageStream = new RedisStream(
  WORKSPACE_USAGE_UPDATES_STREAM_KEY,
);

// Publishes a click event to any relevant streams in a single transaction
export const publishClickEvent = async (event: ClickEvent) => {
  const { linkId, timestamp, workspaceId } = event;
  const entry = { linkId, timestamp, workspaceId };

  try {
    const pipeline = redis.pipeline();

    // TODO: - Uncomment when we handle click updates
    // pipeline.xadd(LINK_CLICK_UPDATES_STREAM_KEY, "*", entry);

    pipeline.xadd(WORKSPACE_USAGE_UPDATES_STREAM_KEY, "*", entry);

    return await pipeline.exec();
  } catch (error) {
    console.error("Failed to publish click update to streams:", error);
    throw error;
  }
};
