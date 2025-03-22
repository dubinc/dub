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
        status: "processed",
        earnings: {
          not: 5000,
        },
        partner: {
          email: {
            in: flatRatePartners,
          },
        },
      };

      const commissions = await prisma.commission.findMany({
        where,
        take: 50,
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
          // Get the first commission (earliest sale) for this customer-partner pair
          const firstCommission = await prisma.commission.findFirst({
            where: {
              partnerId: commission.partnerId,
              customerId: commission.customerId,
              type: "sale",
            },
            orderBy: {
              createdAt: "asc",
            },
          });

          // if the partner has already been rewarded for this customer, set earnings to 0
          // otherwise, set earnings to 5000
          const payload: Prisma.CommissionUpdateInput = {
            earnings:
              firstCommission && firstCommission.id !== commission.id
                ? 0
                : 5000,
          };

          console.log({
            firstCommissionId: firstCommission?.id,
            currentCommissionId: commission.id,
            payload,
          });

          if (payload.earnings === 5000) {
            await prisma.commission.update({
              where: { id: commission.id },
              data: payload,
            });
          }

          if (
            commission.status === "processed" &&
            commission.payoutId &&
            payload.earnings === 5000
          ) {
            const difference = 5000 - commission.earnings;

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
