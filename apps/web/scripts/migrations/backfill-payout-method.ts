import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod, Payout } from "@dub/prisma/client";
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

    const toUpdate: Pick<Payout, "id" | "method">[] = [];

    for (const payout of payouts) {
      let method: PartnerPayoutMethod | null = null;

      if (payout.stripeTransferId || payout.stripePayoutId) {
        method = PartnerPayoutMethod.connect;
      } else if (payout.paypalTransferId) {
        method = PartnerPayoutMethod.paypal;
      }

      if (method) {
        toUpdate.push({
          id: payout.id,
          method,
        });
      }
    }

    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(({ id, method }) =>
          prisma.payout.update({
            where: {
              id,
            },
            data: {
              method,
            },
          }),
        ),
      );
    }

    cursor = payouts[payouts.length - 1].id;
  }

  console.log("Backfill finished.");
}

main();
