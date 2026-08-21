import {
  MIN_WITHDRAWAL_AMOUNT_CENTS,
  STABLECOIN_PAYOUT_FIXED_FEE_CENTS,
} from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { fundFinancialAccount } from "@/lib/stripe/fund-financial-account";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { Invoice, PartnerPayoutMethod } from "@prisma/client";
import { stripeChargeMetadataSchema } from "./utils";

const queue = qstash.queue({
  queueName: "send-stripe-payout",
});

export async function queueStripePayouts({
  invoice,
  fundsAvailable,
}: {
  invoice: Pick<
    Invoice,
    "id" | "paymentMethod" | "stripeChargeMetadata" | "payoutMode"
  >;
  fundsAvailable: boolean;
}) {
  if (invoice.payoutMode === "external") {
    console.log(
      `Invoice ${invoice.id} is paid externally, skipping Stripe payouts...`,
    );
    return;
  }

  const { id: invoiceId, paymentMethod, stripeChargeMetadata } = invoice;

  if (fundsAvailable) {
    // Fund the total Stablecoin payout amount for this invoice
    const { _sum, _count } = await prisma.payout.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        invoiceId: invoice.id,
        method: "stablecoin",
        status: "processing",
        // only transfer funds for stablecoin payouts >= minimum withdrawal amount
        // for payouts below the minimum withdrawal amount, we will just mark them as processed
        // and users can force withdraw them manually later (which triggers another fundFinancialAccount call)
        amount: {
          gte: MIN_WITHDRAWAL_AMOUNT_CENTS,
        },
      },
    });

    // We need to add the STABLECOIN_PAYOUT_FIXED_FEE_CENTS for each payout to the total funding amount
    // to make sure that `createStablecoinPayout` later has enough funds to cover Stripe's fees
    const stablecoinFundingAmount =
      (_sum.amount ?? 0) + _count.id * STABLECOIN_PAYOUT_FIXED_FEE_CENTS;

    // Send money to Financial Account to handle Stablecoin payouts
    if (stablecoinFundingAmount > 0) {
      try {
        await fundFinancialAccount({
          amount: stablecoinFundingAmount,
          idempotencyKey: invoiceId,
        });
      } catch (error) {
        await log({
          message: `Failed to fund Dub's financial account for stablecoin payouts: ${error.message}`,
          type: "errors",
        });

        throw error;
      }
    }
  }

  // Find the id of the charge that was used to fund the transfer
  const parsedChargeMetadata =
    stripeChargeMetadataSchema.safeParse(stripeChargeMetadata);
  const chargeId = parsedChargeMetadata?.success
    ? parsedChargeMetadata?.data.id
    : undefined;

  // this should never happen since all completed invoices should have a charge id, but just in case
  if (!chargeId) {
    await log({
      message:
        "No charge id found in stripeChargeMetadata for invoice " +
        invoiceId +
        ", continuing without source_transaction.",
      type: "errors",
    });
  }

  const partnersInCurrentInvoice = await prisma.payout.groupBy({
    by: ["partnerId"],
    where: {
      invoiceId,
      status: "processing",
      mode: "internal",
      method: {
        in: [
          PartnerPayoutMethod.connect,
          ...(fundsAvailable ? [PartnerPayoutMethod.stablecoin] : []),
        ],
      },
      partner: {
        OR: [
          {
            stripeConnectId: {
              not: null,
            },
          },
          {
            stripeRecipientId: {
              not: null,
            },
          },
        ],
        // here we're not checking for payoutsEnabledAt since we want visiblity
        // if a stripe.transfers.create fails due to restricted Stripe account
      },
    },
  });

  const chunkedPartners = chunk(partnersInCurrentInvoice, 100);

  for (let i = 0; i < chunkedPartners.length; i++) {
    const partnersInChunk = chunkedPartners[i];
    await Promise.allSettled(
      partnersInChunk.map(({ partnerId }) => {
        return queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/send-stripe-payout`,
          deduplicationId: `${invoiceId}-${partnerId}`,
          method: "POST",
          body: {
            partnerId,
            invoiceId,
            // only pass chargeId if payment method is card
            // this is because we're passing chargeId as source_transaction for card payouts since card payouts can take a short time to settle fully
            // we omit chargeId/source_transaction for other payment methods (ACH, SEPA, etc.) since those settle via charge.succeeded webhook after ~4 days
            // x-slack-ref: https://dub.slack.com/archives/C074P7LMV9C/p1758776038825219?thread_ts=1758769780.982089&cid=C074P7LMV9C
            ...(paymentMethod === "card" && { chargeId }),
          },
        });
      }),
    );
    console.log(
      `Enqueued Stripe payout for ${partnersInChunk.length} partners in chunk ${i + 1} of ${chunkedPartners.length}`,
    );
  }
}
