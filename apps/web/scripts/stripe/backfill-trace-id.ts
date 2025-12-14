import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      stripePayoutId: {
        not: null,
      },
      stripePayoutTraceId: null,
    },
    include: {
      partner: {
        select: {
          stripeConnectId: true,
        },
      },
    },
    take: 20,
  });

  await Promise.all(
    payouts.map(async (payout) => {
      try {
        const stripePayout = await stripeConnectClient.payouts.retrieve(
          payout.stripePayoutId!,
          {
            stripeAccount: payout.partner.stripeConnectId!,
          },
        );
        const { status, trace_id } = stripePayout;
        console.log(
          `${payout.id} - ${status} - ${JSON.stringify(trace_id, null, 2)}`,
        );
        if (trace_id?.value) {
          await prisma.payout.update({
            where: { id: payout.id },
            data: { stripePayoutTraceId: trace_id.value },
          });
        }
      } catch (error) {
        console.error(error.message);
      }
    }),
  );
}

main();
