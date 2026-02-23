import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

async function main() {
  let cursor: string | undefined;

  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        defaultPayoutMethod: null,
      },
      select: {
        id: true,
        stripeConnectId: true,
        stripeRecipientId: true,
        paypalEmail: true,
      },
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
      take: BATCH_SIZE,
    });

    if (partners.length === 0) {
      break;
    }

    for (const partner of partners) {
      let defaultPayoutMethod: PartnerPayoutMethod | null = null;

      if (partner.stripeRecipientId) {
        defaultPayoutMethod = PartnerPayoutMethod.stablecoin;
      } else if (partner.stripeConnectId) {
        defaultPayoutMethod = PartnerPayoutMethod.connect;
      } else if (partner.paypalEmail) {
        defaultPayoutMethod = PartnerPayoutMethod.paypal;
      }

      if (defaultPayoutMethod) {
        await prisma.partner.update({
          where: {
            id: partner.id,
            defaultPayoutMethod: null,
          },
          data: {
            defaultPayoutMethod,
          },
        });
      }
    }

    cursor = partners[partners.length - 1].id;
  }

  console.log("Backfill finished.");
}

main();
