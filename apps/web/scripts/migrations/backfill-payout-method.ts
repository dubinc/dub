import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

async function main() {
  while (true) {
    const payouts = await prisma.payout.findMany({
      where: {
        method: null,
        OR: [
          {
            stripeTransferId: {
              not: null,
            },
          },
          {
            paypalTransferId: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        stripeTransferId: true,
        stripePayoutId: true,
        paypalTransferId: true,
      },
      take: BATCH_SIZE,
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
  }

  console.log("Backfill finished.");
}

main();
