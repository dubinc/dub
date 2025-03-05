import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const flatRatePartners: string[] = [];

// update commissions for a program
async function main() {
  Papa.parse(fs.createReadStream("xxx.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { Email: string } }) => {
      flatRatePartners.push(result.data.Email);
    },
    complete: async () => {
      const where: Prisma.CommissionWhereInput = {
        programId: "prog_xxx",
        status: "pending",
        earnings: 0,
        partner: {
          email: {
            notIn: flatRatePartners,
          },
        },
      };

      const commissions = await prisma.commission.findMany({
        where,
        take: 100,
      });

      console.table(commissions, [
        "id",
        "partnerId",
        "amount",
        "earnings",
        "status",
        "createdAt",
      ]);

      await Promise.all(
        commissions.map(async (commission) => {
          const updatedEarnings = commission.amount * 0.3;
          console.log(
            `Updating ${commission.id} from ${commission.earnings} to ${updatedEarnings}`,
          );
          await prisma.commission.update({
            where: { id: commission.id },
            data: {
              earnings: updatedEarnings,
            },
          });
          if (commission.status === "processed" && commission.payoutId) {
            const difference = updatedEarnings - commission.earnings;

            console.log(
              `Updating payout ${commission.payoutId} by ${difference}`,
            );
            await prisma.payout.update({
              where: { id: commission.payoutId },
              data: {
                amount: {
                  increment: difference,
                },
              },
            });
          }
        }),
      );

      const remainingCommissions = await prisma.commission.count({
        where,
      });
      console.log(`${remainingCommissions} commissions left to update`);
    },
  });
}

main();
