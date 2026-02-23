import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

async function main() {
  let cursor: string | undefined;

  while (true) {
    const partners = await prisma.partner.findMany({
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

    const stablecoinPartners: Pick<Partner, "id" | "stripeRecipientId">[] = [];
    const connectPartners: Pick<Partner, "id" | "stripeConnectId">[] = [];
    const paypalPartners: Pick<Partner, "id" | "paypalEmail">[] = [];

    for (const partner of partners) {
      if (partner.stripeRecipientId) {
        stablecoinPartners.push(partner);
      } else if (partner.stripeConnectId) {
        connectPartners.push(partner);
      } else if (partner.paypalEmail) {
        paypalPartners.push(partner);
      }
    }

    const promise1 = prisma.partner.updateMany({
      where: {
        id: {
          in: stablecoinPartners.map((partner) => partner.id),
        },
        defaultPayoutMethod: null,
      },
      data: {
        defaultPayoutMethod: "stablecoin",
      },
    });

    const promise2 = prisma.partner.updateMany({
      where: {
        id: {
          in: connectPartners.map((partner) => partner.id),
        },
        defaultPayoutMethod: null,
      },
      data: {
        defaultPayoutMethod: "connect",
      },
    });

    const promise3 = prisma.partner.updateMany({
      where: {
        id: {
          in: paypalPartners.map((partner) => partner.id),
        },
        defaultPayoutMethod: null,
      },
      data: {
        defaultPayoutMethod: "paypal",
      },
    });

    const [stablecoinRes, connectRes, paypalRes] = await Promise.all([
      stablecoinPartners.length > 0 ? promise1 : Promise.resolve({ count: 0 }),
      connectPartners.length > 0 ? promise2 : Promise.resolve({ count: 0 }),
      paypalPartners.length > 0 ? promise3 : Promise.resolve({ count: 0 }),
    ]);

    console.log(
      `Updated ${stablecoinRes.count} stablecoin partners, ${connectRes.count} connect partners, and ${paypalRes.count} paypal partners`,
    );

    cursor = partners[partners.length - 1].id;
  }
}

main();
