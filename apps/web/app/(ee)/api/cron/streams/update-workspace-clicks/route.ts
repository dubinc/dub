import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
import {
  ClickEvent,
  RedisStreamEntry,
  workspaceUsageStream,
} from "@/lib/upstash/redis-streams";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10000;

type WorkspaceAggregateUsage = {
  workspaceId: string;
  clicks: number;
  firstTimestamp: number;
  lastTimestamp: number;
  entryIds: string[];
};

const aggregateWorkspaceUsage = (
  entries: RedisStreamEntry<ClickEvent>[],
): { updates: WorkspaceAggregateUsage[]; lastProcessedId: string | null } => {
  // Aggregate usage by workspaceId
  const aggregatedUsage = new Map<string, WorkspaceAggregateUsage>();

  let lastId: string | null = null;

  console.log(`Aggregating ${entries.length} workspace usage events`);

  // The entries are a batch of workspace usage events, each with workspaceId, timestamp, and linkId.
  // We want to aggregate by workspaceId, counting total events (clicks) and tracking first/last timestamps.

  for (const entry of entries) {
    const workspaceId = entry.data.workspaceId;

    if (!workspaceId) {
      continue;
    }

    const timestamp = Date.parse(entry.data.timestamp) / 1000;

    lastId = entry.id;

    if (aggregatedUsage.has(workspaceId)) {
      const existing = aggregatedUsage.get(workspaceId)!;
      existing.clicks += 1;
      existing.lastTimestamp = Math.max(existing.lastTimestamp, timestamp);
      existing.firstTimestamp = Math.min(existing.firstTimestamp, timestamp);
      existing.entryIds.push(entry.id);
    } else {
      aggregatedUsage.set(workspaceId, {
        workspaceId,
        clicks: 1,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
        entryIds: [entry.id],
      });
    }
  }

  return {
    updates: Array.from(aggregatedUsage.values()),
    lastProcessedId: lastId,
  };
};

const processWorkspaceUpdateStreamBatch = () =>
  workspaceUsageStream.processBatch<ClickEvent>(
    async (entries) => {
      if (!entries || Object.keys(entries).length === 0) {
        return {
          success: true,
          updates: [],
          processedEntryIds: [],
        };
      }

      const { updates, lastProcessedId } = aggregateWorkspaceUsage(entries);

      if (updates.length === 0) {
        console.log("No workspace usage updates to process");
        return { success: true, updates: [], processedEntryIds: [] };
      }

      console.log(
        `Processing ${updates.length} aggregated workspace usage updates...`,
      );

      // Process updates in parallel batches to avoid overwhelming the database
      const SUB_BATCH_SIZE = 50;
      const batches: (typeof updates)[] = [];

      for (let i = 0; i < updates.length; i += SUB_BATCH_SIZE) {
        batches.push(updates.slice(i, i + SUB_BATCH_SIZE));
      }

      let totalProcessed = 0;
      const errors: { workspaceId: string; error: any }[] = [];
      const processedEntryIds: string[] = [];

      for (const batch of batches) {
        try {
          // Execute all updates in the batch in parallel
          const batchPromises = batch.map(async (update) => {
            try {
              // Update the workspace usage and click counts
              await conn.execute(
                "UPDATE Project p SET p.usage = p.usage + ?, p.totalClicks = p.totalClicks + ? WHERE id = ?",
                [update.clicks, update.clicks, update.workspaceId],
              );

              processedEntryIds.push(...update.entryIds);

              return {
                ...update,
                success: true,
              };
            } catch (error) {
              console.error(
                `Failed to update workspace ${update.workspaceId}:`,
                error,
              );
              return {
                success: false,
                error: { workspaceId: update.workspaceId, error },
              };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);

          // Count successful updates and collect errors
          batchResults.forEach((result) => {
            if (result.status === "fulfilled" && result.value.success) {
              totalProcessed++;
            } else if (
              result.status === "fulfilled" &&
              !result.value.success &&
              result.value.error
            ) {
              errors.push(result.value.error);
            }
          });
        } catch (error) {
          console.error("Failed to process batch:", error);
          errors.push(error);
        }
      }

      // Log results
      const successRate = (totalProcessed / updates.length) * 100;
      console.log(
        `Processed ${totalProcessed}/${updates.length} workspace usage updates (${successRate.toFixed(1)}% success rate)`,
      );

      if (errors.length > 0) {
        console.error(
          `Encountered ${errors.length} errors while processing:`,
          errors.slice(0, 5),
        ); // Log first 5 errors
      }

      return {
        updates,
        errors,
        totalProcessed,
        lastProcessedId,
        processedEntryIds,
      };
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );

// This route is used to process aggregated workspace usage events from Redis streams
// It runs every minute with a batch size of 10,000 to consume high-frequency usage updates
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    console.log("Processing workspace usage updates from Redis stream...");

    const { updates, errors, totalProcessed, lastProcessedId } =
      await processWorkspaceUpdateStreamBatch();

    if (!updates.length) {
      return NextResponse.json({
        success: true,
        message: "No updates to process",
        processed: 0,
      });
    }

    // Get stream info for monitoring
    const streamInfo = await workspaceUsageStream.getStreamInfo();
    const response = {
      success: true,
      processed: totalProcessed,
      errors: errors?.length || 0,
      lastProcessedId,
      streamInfo,
      message: `Successfully processed ${totalProcessed} workspace usage updates`,
    };
    console.log(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to process workspace usage updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
