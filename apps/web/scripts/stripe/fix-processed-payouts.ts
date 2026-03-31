import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const partnersWithProcessingPayouts = await prisma.partner.findMany({
    where: {
      payouts: {
        some: {
          status: "processing",
          stripeTransferId: null,
          invoice: {
            status: "completed",
          },
        },
      },
    },
  });

  console.log(
    `Found ${partnersWithProcessingPayouts.length} partners with processing payouts`,
  );

  const results = await Promise.all(
    partnersWithProcessingPayouts.map(async (partner) => {
      try {
        const stripeConnectAccount =
          await stripeConnectClient.accounts.retrieve(partner.stripeConnectId!);
        return {
          partnerId: partner.id,
          email: partner.email,
          stripeConnectId: partner.stripeConnectId,
          payoutsEnabledAt: partner.payoutsEnabledAt,
          actualPayoutsEnabled: stripeConnectAccount.payouts_enabled,
          transfersEnabled: stripeConnectAccount.capabilities?.transfers,
          transfersEnabledStatus: stripeConnectAccount.capabilities?.transfers,
        };
      } catch (error) {
        return null;
      }
    }),
  );

  console.table(results.filter((result) => result !== null));
}

main();
