import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let eventIds: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("framer_paid_event_ids.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { event_id: string } }) => {
      eventIds.push(result.data.event_id);
    },
    complete: async () => {
      const payoutIdsToUpdate = await prisma.commission.groupBy({
        by: ["payoutId"],
        where: {
          eventId: { in: eventIds },
          payoutId: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            eventId: "desc",
          },
        },
      });

      console.log(payoutIdsToUpdate.slice(0, 50));

      for (const payout of payoutIdsToUpdate.slice(0, 50)) {
        if (!payout.payoutId) {
          continue;
        }

        const updateCommissions = await prisma.commission.updateMany({
          where: {
            payoutId: payout.payoutId,
            eventId: { in: eventIds },
          },
          data: {
            status: "paid",
            payoutId: null,
          },
        });

        console.log(
          `Updated ${updateCommissions.count} commissions to have status "paid" and payoutId null`,
        );

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
          commissionGroupedByPayout.length > 0
            ? commissionGroupedByPayout[0]._sum.earnings
            : null;

        if (!finalCommissionAmount) {
          console.log(
            `No commission amount found for payout ${payout.payoutId}, deleting payout...`,
          );
          await prisma.payout.delete({
            where: {
              id: payout.payoutId,
            },
          });
        } else {
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
      }
    },
  });
}

main();
