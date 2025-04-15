import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutSent from "@dub/email/templates/partner-payout-sent";
import { prisma } from "@dub/prisma";
import { Payload, Payouts } from "./utils";

export const dynamic = "force-dynamic";

export async function sendStripePayouts({
  invoiceId,
  chargeId,
  achCreditTransfer,
  receiptUrl,
  payouts,
}: Payload & { payouts: Payouts[] }) {
  if (payouts.length === 0) {
    console.log("No payouts for sending via Stripe, skipping...");
    return;
  }

  for (const payout of payouts) {
    const transfer = await stripe.transfers.create({
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
    });

    console.log(`Transfer created for payout ${payout.id}`, transfer);

    // TODO:
    // See if we can use the Prisma transaction to update the payout and commission

    await Promise.all([
      prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          stripeTransferId: transfer.id,
          status: "completed",
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
          from: "Dub Partners <system@dub.co>",
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
  }

  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      receiptUrl,
      paidAt: new Date(),
    },
  });
}
