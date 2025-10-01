import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
import { projectUsageStream } from "@/lib/upstash/redis-streams";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to process aggregated project usage events from Redis streams
// It runs every 5 seconds to consume high-frequency usage updates
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    console.log("Processing project usage updates from Redis stream...");

    const { updates, errors, totalProcessed, lastProcessedId } =
      await projectUsageStream.readAndProcessProjectUpdates(
        async (info) => {
          const { updates, lastProcessedId } = info;
          if (updates.length === 0) {
            console.log("No project usage updates to process");
            return { updates: [], errors: [], totalProcessed: 0 };
          }

          console.log(
            `Processing ${updates.length} aggregated project usage updates`,
          );

          // Process updates in parallel batches to avoid overwhelming the database
          const BATCH_SIZE = 50;
          const batches: (typeof updates)[] = [];

          for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            batches.push(updates.slice(i, i + BATCH_SIZE));
          }

          let totalProcessed = 0;
          const errors: any[] = [];

          for (const batch of batches) {
            try {
              // Execute all updates in the batch in parallel
              const batchPromises = batch.map(async (update) => {
                try {
                  // Update the project usage and click counts
                  await conn.execute(
                    "UPDATE Project SET usage = usage + ?, totalClicks = totalClicks + ? WHERE id = ?",
                    [update.totalUsage, update.totalClicks, update.projectId],
                  );

                  return {
                    success: true,
                    projectId: update.projectId,
                    usage: update.totalUsage,
                    clicks: update.totalClicks,
                  };
                } catch (error) {
                  console.error(
                    `Failed to update project ${update.projectId}:`,
                    error,
                  );
                  return { success: false, projectId: update.projectId, error };
                }
              });

              const batchResults = await Promise.allSettled(batchPromises);

              // Count successful updates and collect errors
              batchResults.forEach((result) => {
                if (result.status === "fulfilled" && result.value.success) {
                  totalProcessed++;
                } else {
                  errors.push(
                    result.status === "fulfilled"
                      ? result.value
                      : result.reason,
                  );
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

          return { updates, errors, totalProcessed, lastProcessedId };
        },
        {
          count: 1000, // Process up to 1000 entries at once
          deleteAfterRead: true, // Clean up processed entries
        },
      );

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
      errors: errors.length,
      lastProcessedId,
      streamInfo,
      message: `Successfully processed ${totalProcessed} project usage updates`,
    });
  } catch (error) {
    console.error("Failed to process project usage updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
