import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutSent from "@dub/email/templates/partner-payout-sent";
import { prisma } from "@dub/prisma";
import { Payload, Payouts } from "./utils";

export async function sendStripePayouts({
  payload,
  payouts,
}: {
  payload: Payload;
  payouts: Payouts[];
}) {
  if (payouts.length === 0) {
    console.log("No payouts for sending via Stripe, skipping...");
    return;
  }

  const { invoiceId, chargeId, achCreditTransfer } = payload;

  for (const payout of payouts) {
    const transfer = await stripe.transfers.create(
      {
        amount: payout.amount,
        currency: "usd",
        transfer_group: invoiceId,
        destination: payout.partner.stripeConnectId!,
        description: `Dub Partners payout (${payout.program.name})`,
        ...(!achCreditTransfer
          ? {
              source_transaction: chargeId,
            }
          : {}),
      },
      { idempotencyKey: payout.id }, // add idempotency key to avoid duplicate transfers
    );

    console.log(`Transfer ${transfer.id} created for payout ${payout.id}`);

    await Promise.allSettled([
      prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          stripeTransferId: transfer.id,
          status: "sent",
          paidAt: new Date(),
        },
      }),

      prisma.commission.updateMany({
        where: {
          payoutId: payout.id,
        },
        data: {
          status: "paid",
        },
      }),

      payout.partner.email &&
        sendEmail({
          subject: "You've been paid!",
          email: payout.partner.email,
          react: PartnerPayoutSent({
            email: payout.partner.email,
            program: payout.program,
            payout: {
              id: payout.id,
              amount: payout.amount,
              startDate: payout.periodStart,
              endDate: payout.periodEnd,
            },
          }),
          variant: "notifications",
        }),
    ]);

    // sleep for 250ms
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
