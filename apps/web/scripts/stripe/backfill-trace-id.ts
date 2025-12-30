import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      stripePayoutId: {
        not: null,
      },
      OR: [
        {
          status: "sent",
        },
        {
          stripePayoutTraceId: null,
        },
      ],
    },
    include: {
      partner: {
        select: {
          stripeConnectId: true,
        },
      },
    },
    orderBy: {
      paidAt: "asc",
    },
  });

  const chunks = chunk(payouts, 20);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
    await Promise.all(
      chunk.map(async (payout) => {
        try {
          const stripePayout = await stripeConnectClient.payouts.retrieve(
            payout.stripePayoutId!,
            {
              stripeAccount: payout.partner.stripeConnectId!,
            },
          );
          const { status, trace_id } = stripePayout;
          const stripePayoutTraceId = trace_id?.value;
          if (
            (status === "paid" && payout.status !== "completed") ||
            (stripePayoutTraceId &&
              payout.stripePayoutTraceId !== stripePayoutTraceId)
          ) {
            const res = await prisma.payout.update({
              where: { id: payout.id },
              data: {
                status: status === "paid" ? "completed" : undefined,
                stripePayoutTraceId,
              },
            });
            console.log(
              `Updated payout ${payout.id} to ${res.status} - ${res.stripePayoutTraceId}`,
            );
          }
        } catch (error) {
          // console.error(error.message);
        }
      }),
    );
  }
}

main();
