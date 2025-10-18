import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
import {
  PartnerActivityEvent,
  partnerActivityStream,
} from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";
import { differenceInDays, format } from "date-fns";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10000;

const processPartnerActivityStreamBatch = () =>
  partnerActivityStream.processBatch<PartnerActivityEvent>(
    async (entries) => {
      if (!entries || Object.keys(entries).length === 0) {
        return {
          success: true,
          updates: [],
          processedEntryIds: [],
        };
      }

      console.log(`Aggregating ${entries.length} partner activity events`);

      const programEnrollmentActivity = entries.reduce(
        (acc, entry) => {
          const { programId, partnerId, eventType } = entry.data;
          const key =
            eventType === "commission" ? "commissionStats" : "linkStats";
          const eventTypesSet = new Set(acc[key]);
          eventTypesSet.add(`${programId}:${partnerId}`);
          acc[key] = Array.from(eventTypesSet);
          return acc;
        },
        { linkStats: [], commissionStats: [] } as Record<string, string[]>,
      );

      const programEnrollmentsToUpdate: Record<
        string,
        {
          totalClicks?: number;
          totalLeads?: number;
          totalConversions?: number;
          totalSales?: number;
          totalSaleAmount?: number;
          totalCommissions?: number;
          lastConversionAt?: Date | null;
          conversionRate?: number | null;
          averageLifetimeValue?: number | null;
          leadConversionRate?: number | null;
          daysSinceLastConversion?: number | null;
          consistencyScore?: number | null;
        }
      > = {};

      if (programEnrollmentActivity.linkStats.length > 0) {
        const programIds = programEnrollmentActivity.linkStats.map(
          (p) => p.split(":")[0],
        );
        const partnerIds = programEnrollmentActivity.linkStats.map(
          (p) => p.split(":")[1],
        );
        const partnerLinkStats = await prisma.link.groupBy({
          by: ["programId", "partnerId"],
          where: {
            programId: {
              in: programIds,
            },
            partnerId: {
              in: partnerIds,
            },
          },
          _sum: {
            clicks: true,
            leads: true,
            conversions: true,
            sales: true,
            saleAmount: true,
          },
          _max: {
            lastConversionAt: true,
          },
        });

        partnerLinkStats.map((p) => {
          programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`] = {
            totalClicks: p._sum.clicks ?? undefined,
            totalLeads: p._sum.leads ?? undefined,
            totalConversions: p._sum.conversions ?? undefined,
            totalSales: p._sum.sales ?? undefined,
            totalSaleAmount: p._sum.saleAmount ?? undefined,
            lastConversionAt: p._max.lastConversionAt ?? undefined,
          };
        });
      }

      if (programEnrollmentActivity.commissionStats.length > 0) {
        const programIds = programEnrollmentActivity.commissionStats.map(
          (p) => p.split(":")[0],
        );
        const partnerIds = programEnrollmentActivity.commissionStats.map(
          (p) => p.split(":")[1],
        );
        const partnerCommissionStats = await prisma.commission.groupBy({
          by: ["programId", "partnerId"],
          where: {
            earnings: { not: 0 },
            programId: {
              in: programIds,
            },
            partnerId: {
              in: partnerIds,
            },
            status: { in: ["pending", "processed", "paid"] },
          },
          _sum: {
            earnings: true,
          },
        });
        partnerCommissionStats.map((p) => {
          programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`] = {
            ...programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`], // need to keep the other stats
            totalCommissions: p._sum.earnings ?? undefined,
          };
        });
      }

      // Calculate derived metrics for each enrollment
      Object.keys(programEnrollmentsToUpdate).forEach((key) => {
        const enrollment = programEnrollmentsToUpdate[key];
        const {
          totalClicks,
          totalLeads,
          totalConversions,
          totalSaleAmount,
          lastConversionAt,
        } = enrollment;

        // Calculate conversion rate (totalConversions / totalClicks)
        if (totalClicks && totalClicks > 0 && totalConversions) {
          enrollment.conversionRate = totalConversions / totalClicks;
        }

        // Calculate average lifetime value (totalSaleAmount / totalConversions)
        if (totalConversions && totalConversions > 0 && totalSaleAmount) {
          enrollment.averageLifetimeValue = totalSaleAmount / totalConversions;
        }

        // Calculate lead conversion rate (totalConversions / totalLeads)
        if (totalLeads && totalLeads > 0 && totalConversions) {
          enrollment.leadConversionRate = totalConversions / totalLeads;
        }

        // Calculate days since last conversion
        if (lastConversionAt) {
          enrollment.daysSinceLastConversion = differenceInDays(
            new Date(),
            new Date(lastConversionAt),
          );
        }

        // Calculate consistency score based on days since last conversion
        let consistencyScore = 50;
        if (lastConversionAt && enrollment.daysSinceLastConversion) {
          if (enrollment.daysSinceLastConversion <= 7) {
            consistencyScore = 100;
          } else if (enrollment.daysSinceLastConversion <= 30) {
            consistencyScore = 85;
          } else if (enrollment.daysSinceLastConversion <= 90) {
            consistencyScore = 70;
          } else if (enrollment.daysSinceLastConversion <= 180) {
            consistencyScore = 55;
          } else {
            consistencyScore = 40;
          }
        }

        enrollment.consistencyScore = consistencyScore;
      });

      const programEnrollmentsToUpdateArray = Object.entries(
        programEnrollmentsToUpdate,
      ).map(([key, value]) => ({
        programId: key.split(":")[0],
        partnerId: key.split(":")[1],
        ...value,
      }));

      console.table(programEnrollmentsToUpdateArray);

      if (programEnrollmentsToUpdateArray.length === 0) {
        console.log("No program enrollments to update");
        return { success: true, updates: [], processedEntryIds: [] };
      }

      console.log(
        `Processing ${programEnrollmentsToUpdateArray.length} program enrollments updates...`,
      );

      // Process updates in parallel batches to avoid overwhelming the database
      const SUB_BATCH_SIZE = 50;
      const batches: (typeof programEnrollmentsToUpdateArray)[] = [];

      for (
        let i = 0;
        i < programEnrollmentsToUpdateArray.length;
        i += SUB_BATCH_SIZE
      ) {
        batches.push(
          programEnrollmentsToUpdateArray.slice(i, i + SUB_BATCH_SIZE),
        );
      }

      let totalProcessed = 0;
      const errors: { programId: string; partnerId: string; error: any }[] = [];
      const processedEntryIds: string[] = [];

      // Collect all entry IDs for tracking
      entries.forEach((entry) => {
        processedEntryIds.push(entry.id);
      });

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(async (programEnrollment) => {
            const { programId, partnerId, ...stats } = programEnrollment;
            const finalStatsToUpdate = Object.entries(stats).filter(
              ([_, value]) => value !== undefined,
            );

            try {
              // Update program enrollment stats
              if (finalStatsToUpdate.length > 0) {
                await conn.execute(
                  `UPDATE ProgramEnrollment SET ${finalStatsToUpdate
                    .map(([key, _]) => `${key} = ?`)
                    .join(", ")} WHERE programId = ? AND partnerId = ?`,
                  [
                    ...finalStatsToUpdate.map(([_, value]) =>
                      value instanceof Date
                        ? format(value, "yyyy-MM-dd HH:mm:ss")
                        : value,
                    ),
                    programId,
                    partnerId,
                  ],
                );
              }
              totalProcessed++;
            } catch (error) {
              console.error(
                `Failed to update program enrollment ${programId}:${partnerId}:`,
                error,
              );
              errors.push({
                programId,
                partnerId,
                error,
              });
            }
          }),
        );
      }

      // Log results
      const successRate =
        (totalProcessed / programEnrollmentsToUpdateArray.length) * 100;
      console.log(
        `Processed ${totalProcessed}/${programEnrollmentsToUpdateArray.length} program enrollments updates (${successRate.toFixed(1)}% success rate)`,
      );

      if (errors.length > 0) {
        console.error(
          `Encountered ${errors.length} errors while processing:`,
          errors.slice(0, 5),
        ); // Log first 5 errors
      }

      return {
        updates: programEnrollmentsToUpdateArray,
        errors,
        totalProcessed,
        processedEntryIds,
      };
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );

// This route is used to process partner activity events from Redis streams
// It runs every 5 minutes with a batch size of 10,000 to consume high-frequency partner activity updates
// GET /api/cron/streams/update-partner-stats
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    console.log("Processing partner activity events from Redis stream...");

    const { updates, errors, totalProcessed } =
      await processPartnerActivityStreamBatch();

    if (!updates.length) {
      return NextResponse.json({
        success: true,
        message: "No updates to process",
        processed: 0,
      });
    }

    // Get stream info for monitoring
    const streamInfo = await partnerActivityStream.getStreamInfo();
    const response = {
      success: true,
      processed: totalProcessed,
      errors: errors?.length || 0,
      streamInfo,
      message: `Successfully processed ${totalProcessed} partner activity updates`,
    };
    console.log(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to process partner activity updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
