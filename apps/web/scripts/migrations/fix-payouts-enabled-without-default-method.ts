import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

// Reconciles partners that ended up with payoutsEnabledAt set while defaultPayoutMethod is null.
// Re-runs recomputePartnerPayoutState so both fields reflect the partner's
// actual Stripe/PayPal state.
async function main() {
  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        payoutsEnabledAt: {
          not: null,
        },
        defaultPayoutMethod: null,
      },
      select: {
        id: true,
        email: true,
        stripeConnectId: true,
        stripeRecipientId: true,
        paypalEmail: true,
        payoutsEnabledAt: true,
        defaultPayoutMethod: true,
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

    const results = await Promise.allSettled(
      partners.map(async (partner) => {
        const { payoutsEnabledAt, defaultPayoutMethod, cryptoWalletAddress } =
          await recomputePartnerPayoutState(partner);

        await prisma.partner.update({
          where: {
            id: partner.id,
          },
          data: {
            payoutsEnabledAt,
            defaultPayoutMethod,
            cryptoWalletAddress,
          },
        });

        return {
          id: partner.id,
          email: partner.email,
          payoutsEnabledAt,
          defaultPayoutMethod,
        };
      }),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        totalUpdated += 1;
        console.log(
          `Fixed partner ${result.value.email} (${result.value.id}): payoutsEnabledAt=${result.value.payoutsEnabledAt?.toISOString() ?? "null"}, defaultPayoutMethod=${result.value.defaultPayoutMethod ?? "null"}`,
        );
      } else {
        console.error(
          `Failed to fix partner ${partners[index].id}:`,
          result.reason,
        );
      }
    }

    totalProcessed += partners.length;
    cursor = partners[partners.length - 1].id;

    console.log(`Processed ${totalProcessed} partners so far...`);

    // Small delay between batches to avoid Stripe API rate limits, since
    // recomputePartnerPayoutState makes multiple Stripe calls per partner.
    if (partners.length === BATCH_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(
    `Done. Processed ${totalProcessed} partners, updated ${totalUpdated}.`,
  );
}

main();
