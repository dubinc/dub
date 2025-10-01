import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
import { clickUpdatesStream } from "@/lib/upstash/redis-streams";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to process aggregated click events from Redis streams
// It runs every 5 seconds to consume high-frequency click updates
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    console.log("Processing click updates from Redis stream...");

    // Read and process updates from the stream
    const { updates, lastProcessedId } =
      await clickUpdatesStream.readAndProcessUpdates({
        count: 1000, // Process up to 1000 entries at once
        deleteAfterRead: true, // Clean up processed entries
      });

    if (updates.length === 0) {
      console.log("No click updates to process");
      return NextResponse.json({
        success: true,
        message: "No updates to process",
        processed: 0,
      });
    }

    console.log(`Processing ${updates.length} aggregated click updates`);

    // Process updates in parallel batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const batches: (typeof updates)[] = [];

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }

    let totalProcessed = 0;
    const errors: any[] = [];

    for (const batch of batches) {
      console.log("Processing batch:", JSON.stringify(batch, null, 2));
      try {
        // Execute all updates in the batch in parallel
        const batchPromises = batch.map(async (update) => {
          try {
            // Update the click count for the link
            await conn.execute(
              "UPDATE Link SET clicks = clicks + ?, lastClicked = FROM_UNIXTIME(?) WHERE id = ?",
              [
                update.totalCount,
                Math.floor(update.lastTimestamp / 1000),
                update.linkId,
              ],
            );

            return {
              success: true,
              linkId: update.linkId,
              count: update.totalCount,
            };
          } catch (error) {
            console.error(`Failed to update link ${update.linkId}:`, error);
            return { success: false, linkId: update.linkId, error };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // Count successful updates and collect errors
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value.success) {
            totalProcessed++;
          } else {
            errors.push(
              result.status === "fulfilled" ? result.value : result.reason,
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
      `Processed ${totalProcessed}/${updates.length} click updates (${successRate.toFixed(1)}% success rate)`,
    );

    if (errors.length > 0) {
      console.error(
        `Encountered ${errors.length} errors while processing:`,
        errors.slice(0, 5),
      ); // Log first 5 errors
    }

    // Get stream info for monitoring
    const streamInfo = await clickUpdatesStream.getStreamInfo();

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      errors: errors.length,
      lastProcessedId,
      streamInfo,
      message: `Successfully processed ${totalProcessed} click updates`,
    });
  } catch (error) {
    console.error("Failed to process click updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
