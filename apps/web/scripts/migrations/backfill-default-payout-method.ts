import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

async function main() {
  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        defaultPayoutMethod: null,
        OR: [
          {
            stripeConnectId: {
              not: null,
            },
          },
          {
            paypalEmail: {
              not: null,
            },
          },
        ],
      },
      select: {
        id: true,
        stripeConnectId: true,
        paypalEmail: true,
      },
      take: BATCH_SIZE,
    });

    if (partners.length === 0) {
      break;
    }

    const connectPartners: Pick<Partner, "id" | "stripeConnectId">[] = [];
    const paypalPartners: Pick<Partner, "id" | "paypalEmail">[] = [];

    for (const partner of partners) {
      if (partner.stripeConnectId) {
        connectPartners.push(partner);
      } else if (partner.paypalEmail) {
        paypalPartners.push(partner);
      }
    }

    const promise1 =
      connectPartners.length > 0
        ? prisma.partner.updateMany({
            where: {
              id: {
                in: connectPartners.map((partner) => partner.id),
              },
              defaultPayoutMethod: null,
            },
            data: {
              defaultPayoutMethod: "connect",
            },
          })
        : Promise.resolve({ count: 0 });

    const promise2 =
      paypalPartners.length > 0
        ? prisma.partner.updateMany({
            where: {
              id: {
                in: paypalPartners.map((partner) => partner.id),
              },
              defaultPayoutMethod: null,
            },
            data: {
              defaultPayoutMethod: "paypal",
            },
          })
        : Promise.resolve({ count: 0 });

    const [connectRes, paypalRes] = await Promise.all([promise1, promise2]);

    console.log(
      `Updated ${connectRes.count} connect partners and ${paypalRes.count} paypal partners`,
    );
  }
}

main();
