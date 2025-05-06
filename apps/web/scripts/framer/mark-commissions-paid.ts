import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const eventIds: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("framer_paid_event_ids.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { event_id: string } }) => {
      eventIds.push(result.data.event_id);
    },
    complete: async () => {
      //   const commissionsToUpdate = await prisma.commission.findMany({
      //     where: {
      //       eventId: { in: eventIds },
      //     },
      //     orderBy: {
      //       createdAt: "asc",
      //     },
      //   });

      //   console.log(
      //     `Found ${commissionsToUpdate.length} commissions to mark as paid`,
      //   );

      //   const payoutsToUpdate = await prisma.commission.groupBy({
      //     by: ["payoutId"],
      //     where: {
      //       eventId: { in: eventIds },
      //     },
      //     _count: true,
      //     orderBy: {
      //       _count: {
      //         eventId: "desc",
      //       },
      //     },
      //   });

      //   console.log(
      //     `Found ${payoutsToUpdate.length} payouts to update commission totals`,
      //   );

      const commissions = await prisma.commission.updateMany({
        where: {
          eventId: { in: eventIds },
        },
        data: {
          status: "paid",
          payoutId: null,
        },
      });

      console.log(
        `Updated ${commissions} commissions to have a payoutId of null`,
      );

      const payoutIdsToUpdate = await prisma.commission.groupBy({
        by: ["payoutId"],
        where: {
          eventId: { in: eventIds },
        },
      });

      for (const payout of payoutIdsToUpdate) {
        if (!payout.payoutId) {
          continue;
        }

        const commissionGroupedByPayout = await prisma.commission.groupBy({
          by: ["payoutId"],
          where: {
            payoutId: payout.payoutId,
          },
          _sum: {
            earnings: true,
          },
        });

        const finalCommissionAmount =
          commissionGroupedByPayout[0]._sum.earnings;

        if (!finalCommissionAmount) {
          console.log(
            `No commission amount found for payout ${payout.payoutId}, deleting payout...`,
          );
          await prisma.payout.delete({
            where: {
              id: payout.payoutId,
            },
          });
          continue;
        }

        console.log(
          `Updating payout ${payout.payoutId} with amount ${finalCommissionAmount}`,
        );
        await prisma.payout.update({
          where: {
            id: payout.payoutId,
          },
          data: {
            amount: finalCommissionAmount,
          },
        });
      }
    },
  });
}

main();
