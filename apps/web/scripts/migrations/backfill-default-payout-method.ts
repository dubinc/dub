import { prisma } from "@dub/prisma";
import { Partner, PartnerPayoutMethod } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

async function main() {
  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        payoutsEnabledAt: null,
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
          {
            stripeRecipientId: {
              not: null,
            },
          },
        ],
        payouts: {
          some: {
            status: "completed",
          },
        },
      },
      select: {
        id: true,
        stripeConnectId: true,
        paypalEmail: true,
        stripeRecipientId: true,
      },
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

    const promise0 =
      stablecoinPartners.length > 0
        ? prisma.partner.updateMany({
            where: {
              id: {
                in: stablecoinPartners.map((partner) => partner.id),
              },
            },
            data: {
              defaultPayoutMethod: PartnerPayoutMethod.stablecoin,
            },
          })
        : Promise.resolve({ count: 0 });

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
              defaultPayoutMethod: PartnerPayoutMethod.connect,
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
              defaultPayoutMethod: PartnerPayoutMethod.paypal,
            },
          })
        : Promise.resolve({ count: 0 });

    const [stablecoinRes, connectRes, paypalRes] = await Promise.all([
      promise0,
      promise1,
      promise2,
    ]);

    console.log(
      `Updated ${stablecoinRes.count} stablecoin partners and ${connectRes.count} connect partners and ${paypalRes.count} paypal partners`,
    );
  }
}

main();
