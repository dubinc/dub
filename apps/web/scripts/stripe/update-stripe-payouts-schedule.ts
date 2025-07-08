import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const limit = 1;
  const offset = 0;

  const partners = await prisma.partner.findMany({
    where: {
      stripeConnectId: {
        not: null,
      },
    },
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (partners.length === 0) {
    console.log("No partners found.");
    return;
  }

  for (const partner of partners) {
    try {
      await stripe.accounts.update(partner.stripeConnectId!, {
        settings: {
          payouts: {
            schedule: {
              interval: "manual",
            },
          },
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
}

main();
