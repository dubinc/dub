import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

async function main() {
  let cursor: string | undefined;

  while (true) {
    const payouts = await prisma.payout.findMany({
      select: {
        id: true,
        stripeTransferId: true,
        stripePayoutId: true,
        paypalTransferId: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
      ...(cursor
        ? {
            skip: 1,
            cursor: {
              id: cursor,
            },
          }
        : {}),
    });

    if (payouts.length === 0) {
      break;
    }

    const connectPayoutIds: string[] = [];
    const paypalPayoutIds: string[] = [];

    for (const payout of payouts) {
      if (payout.stripeTransferId || payout.stripePayoutId) {
        connectPayoutIds.push(payout.id);
      } else if (payout.paypalTransferId) {
        paypalPayoutIds.push(payout.id);
      }
    }

    const [connectRes, paypalRes] = await Promise.all([
      connectPayoutIds.length > 0
        ? prisma.payout.updateMany({
            where: {
              id: {
                in: connectPayoutIds,
              },
            },
            data: {
              method: PartnerPayoutMethod.connect,
            },
          })
        : Promise.resolve({ count: 0 }),

      paypalPayoutIds.length > 0
        ? prisma.payout.updateMany({
            where: {
              id: {
                in: paypalPayoutIds,
              },
            },
            data: {
              method: PartnerPayoutMethod.paypal,
            },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    console.log(
      `Updated ${connectRes.count} connect payouts and ${paypalRes.count} paypal payouts`,
    );

    cursor = payouts[payouts.length - 1].id;
  }

  console.log("Backfill finished.");
}

main();
