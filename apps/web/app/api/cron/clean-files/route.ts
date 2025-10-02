import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

/*
    This route is used to clean up files that don't have related QRs and are older than 1 day.
    Runs every hour (0 * * * *)
*/
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    await verifyVercelSignature(req);

    // Calculate 1 day ago timestamp
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let totalDeletedCount = 0;
    let batchCount = 0;

    // Process all orphaned files in batches until none are left
    while (true) {
      batchCount++;

      // Find files without related QRs that are older than 1 day
      const orphanedFiles = await prisma.file.findMany({
        where: {
          createdAt: {
            lt: oneDayAgo,
          },
          qrs: {
            none: {}, // Files that have no related QRs
          },
        },
        take: 100, // Process in batches for performance
      });

      // If no more orphaned files found, break the loop
      if (orphanedFiles.length === 0) {
        break;
      }

      console.log(
        `Processing batch ${batchCount}: ${orphanedFiles.length} orphaned files`,
      );

      // First, try to delete files from storage
      const storageResults = await Promise.allSettled(
        orphanedFiles.map(async (file) => ({
          fileId: file.id,
          result: await storage.delete(`qrs-content/${file.id}`),
        })),
      );

      // Collect successfully deleted file IDs
      const successfullyDeletedFileIds: string[] = [];
      const failedStorageDeletions: string[] = [];

      storageResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfullyDeletedFileIds.push(orphanedFiles[index].id);
        } else {
          failedStorageDeletions.push(orphanedFiles[index].id);
          console.error(
            `Failed to delete file ${orphanedFiles[index].id} from storage:`,
            result.reason,
          );
        }
      });

      // Only delete database records for files successfully deleted from storage
      if (successfullyDeletedFileIds.length > 0) {
        try {
          await prisma.file.deleteMany({
            where: {
              id: {
                in: successfullyDeletedFileIds,
              },
            },
          });
          console.log(
            `Batch ${batchCount}: Successfully deleted ${successfullyDeletedFileIds.length} files from storage and database`,
          );
        } catch (error) {
          console.error(
            `Batch ${batchCount}: Failed to delete database records for files:`,
            successfullyDeletedFileIds,
            error,
          );
          await log({
            message: `File cleanup batch ${batchCount}: Database deletion failed for ${successfullyDeletedFileIds.length} files that were deleted from storage`,
            type: "errors",
          });
        }
      }

      // Log failures
      if (failedStorageDeletions.length > 0) {
        console.error(
          `Batch ${batchCount}: Failed to delete ${failedStorageDeletions.length} files from storage`,
        );
        await log({
          message: `File cleanup batch ${batchCount}: Storage deletion failed for ${failedStorageDeletions.length} files`,
          type: "errors",
        });
      }

      totalDeletedCount += successfullyDeletedFileIds.length;
      console.log(
        `Batch ${batchCount} completed: ${successfullyDeletedFileIds.length} files deleted (${totalDeletedCount} total so far)`,
      );
    }

    if (totalDeletedCount === 0) {
      return NextResponse.json({
        status: "OK",
        message: "No orphaned files found",
        deleted: 0,
        batches: 0,
      });
    }

    await log({
      message: `Successfully cleaned up ${totalDeletedCount} orphaned files in ${batchCount - 1} batches`,
      type: "cron",
    });

    console.log(
      `Cleanup completed: ${totalDeletedCount} orphaned files deleted in ${batchCount - 1} batches`,
    );

    return NextResponse.json({
      status: "OK",
      message: `Cleaned up ${totalDeletedCount} orphaned files`,
      deleted: totalDeletedCount,
      batches: batchCount - 1,
    });
  } catch (error) {
    await log({
      message: `File cleanup cron job failed: ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
