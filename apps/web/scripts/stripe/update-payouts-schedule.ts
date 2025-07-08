import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const offset = 2900;

  const commonFields = {
    where: {
      stripeConnectId: {
        not: null,
      },
    },
    skip: offset,
  };

  const partners = await prisma.partner.findMany({
    ...commonFields,
    take: 100,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (partners.length === 0) {
    console.log("No partners found.");
    return;
  }

  await Promise.all(
    partners.map(async (partner) => {
      try {
        const res = await stripeConnectClient.accounts.update(
          partner.stripeConnectId!,
          {
            settings: {
              payouts: {
                schedule: {
                  interval: "manual",
                },
              },
            },
          },
        );

        console.log(
          `Updated payout schedule for partner ${partner.email} (${partner.stripeConnectId}): ${res.id}`,
        );
      } catch (error) {
        console.error(error);
      }
    }),
  );

  const remaining = await prisma.partner.count(commonFields);
  console.log(`Remaining: ${remaining}`);
}

main();
