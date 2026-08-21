import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Reconciles partners that ended up with payoutsEnabledAt set while defaultPayoutMethod is null.
async function main() {
  await scriptOne();
  await scriptTwo();
}

// Backfills `defaultPayoutMethod` to "connect" for partners who have payouts enabled
// via a Stripe Connect account but are missing a default payout method.
async function scriptOne() {
  const partners = await prisma.partner.findMany({
    where: {
      payoutsEnabledAt: {
        not: null,
      },
      stripeConnectId: {
        not: null,
      },
      defaultPayoutMethod: null,
      paypalEmail: null,
      stripeRecipientId: null,
    },
    select: {
      id: true,
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      payoutsEnabledAt: true,
      defaultPayoutMethod: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.table(partners);

  if (partners.length === 0) {
    console.log("No partners found");
    return;
  }

  const { count } = await prisma.partner.updateMany({
    where: {
      id: {
        in: partners.map((partner) => partner.id),
      },
    },
    data: {
      defaultPayoutMethod: "connect",
    },
  });

  console.log(`Updated ${count} partners`);
}

// Clears `defaultPayoutMethod` for partners who no longer have payouts enabled,
// processing in batches of 500 to avoid long-running queries.
async function scriptTwo() {
  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        payoutsEnabledAt: null,
        defaultPayoutMethod: {
          not: null,
        },
      },
      take: 500,
    });

    if (partners.length === 0) {
      break;
    }

    const { count } = await prisma.partner.updateMany({
      where: {
        id: {
          in: partners.map((partner) => partner.id),
        },
      },
      data: {
        defaultPayoutMethod: null,
      },
    });

    console.log(`Updated ${count} partners`);
  }
}

main();
