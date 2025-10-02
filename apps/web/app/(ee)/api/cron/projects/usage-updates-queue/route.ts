import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
import {
  ClickEvent,
  Entry,
  projectUsageStream,
} from "@/lib/upstash/redis-streams";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;

type ProjectAggregateUsage = {
  projectId: string;
  usage: number;
  clicks: number;
  firstTimestamp: number;
  lastTimestamp: number;
};

type ProcessResponse = {
  success: boolean;
  updates: ProjectAggregateUsage[];
  errors?: { projectId: string; error: any }[];
  totalProcessed?: number;
  lastProcessedId?: string | null;
};

const aggregateProjectUsage = (
  entries: Entry<ClickEvent>[],
): { updates: ProjectAggregateUsage[]; lastProcessedId: string | null } => {
  // Aggregate usage by projectId
  const aggregatedUsage = new Map<string, ProjectAggregateUsage>();

  let lastId: string | null = null;

  // The entries are a batch of project usage events, each with projectId, timestamp, and possibly linkId.
  // We want to aggregate by projectId, counting total events (clicks) and tracking first/last timestamps.

  for (const entry of entries) {
    const projectId = entry.data.projectId;

    if (!projectId) {
      continue;
    }

    const timestamp = Date.parse(entry.data.timestamp) / 1000;

    lastId = entry.id;

    if (aggregatedUsage.has(projectId)) {
      const existing = aggregatedUsage.get(projectId)!;
      existing.usage += 1;
      existing.clicks += 1;
      existing.lastTimestamp = Math.max(existing.lastTimestamp, timestamp);
      existing.firstTimestamp = Math.min(existing.firstTimestamp, timestamp);
    } else {
      aggregatedUsage.set(projectId, {
        projectId,
        usage: 1,
        clicks: 1,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
      });
    }
  }

  return {
    updates: Array.from(aggregatedUsage.values()),
    lastProcessedId: lastId,
  };
};

const processProjectUpdateStreamBatch = () =>
  projectUsageStream.processBatch<ClickEvent, ProcessResponse>(
    async (entries) => {
      if (!entries || Object.keys(entries).length === 0) {
        return {
          success: true,
          updates: [],
        } as ProcessResponse;
      }

      const { updates, lastProcessedId } = aggregateProjectUsage(entries);

      if (updates.length === 0) {
        console.log("No project usage updates to process");
        return { success: true, updates: [] } as ProcessResponse;
      }

      console.log(
        `Processing ${updates.length} aggregated project usage updates`,
      );

      // Process updates in parallel batches to avoid overwhelming the database
      const SUB_BATCH_SIZE = 50;
      const batches: (typeof updates)[] = [];

      for (let i = 0; i < updates.length; i += SUB_BATCH_SIZE) {
        batches.push(updates.slice(i, i + SUB_BATCH_SIZE));
      }

      let totalProcessed = 0;
      const errors: { projectId: string; error: any }[] = [];

      for (const batch of batches) {
        console.log(`BATCH: ${JSON.stringify(batch)}`);
        try {
          // Execute all updates in the batch in parallel
          const batchPromises = batch.map(async (update) => {
            try {
              // Update the project usage and click counts
              // "usage" is a reserved keyword in MySQL, so we must escape it with backticks
              await conn.execute(
                "UPDATE Project p SET p.usage = p.usage + ?, p.totalClicks = p.totalClicks + ? WHERE id = ?",
                [update.usage, update.clicks, update.projectId],
              );

              return {
                ...update,
                success: true,
              };
            } catch (error) {
              console.error(
                `Failed to update project ${update.projectId}:`,
                error,
              );
              return {
                success: false,
                error: { projectId: update.projectId, error },
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
        `Processed ${totalProcessed}/${updates.length} project usage updates (${successRate.toFixed(1)}% success rate)`,
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
      } as ProcessResponse;
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );

// This route is used to process aggregated project usage events from Redis streams
// It runs every 5 seconds to consume high-frequency usage updates
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    console.log("Processing project usage updates from Redis stream...");

    const { updates, errors, totalProcessed, lastProcessedId } =
      await processProjectUpdateStreamBatch();

    if (!updates.length) {
      return NextResponse.json({
        success: true,
        message: "No updates to process",
        processed: 0,
      });
    }

    // Get stream info for monitoring
    const streamInfo = await projectUsageStream.getStreamInfo();

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      errors: errors?.length || 0,
      lastProcessedId,
      streamInfo,
      message: `Successfully processed ${totalProcessed} project usage updates`,
    });
  } catch (error) {
    console.error("Failed to process project usage updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
