import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutSent from "@dub/email/templates/partner-payout-sent";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
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
    const { partner } = payout;

    if (!partner.stripeConnectId) {
      console.log(`No Stripe account found for partner ${partner.id}`);
      continue;
    }

    // 1. Create a Stripe transfer
    const transfer = await stripe.transfers.create(
      {
        amount: payout.amount,
        currency: "usd",
        transfer_group: invoiceId,
        destination: partner.stripeConnectId,
        description: `Dub Partners payout (${payout.program.name})`,
        ...(!achCreditTransfer
          ? {
              source_transaction: chargeId,
            }
          : {}),
      },
      { idempotencyKey: payout.id }, // add idempotency key to avoid duplicate transfers
    );

    console.log(
      `Transfer (${transfer.id}) created for payout ${payout.id} with amount ${currencyFormatter(transfer.amount / 100)}.`,
    );

    // 2. Check Stripe balance
    const stripeBalance = await stripe.balance.retrieve({
      stripeAccount: partner.stripeConnectId,
    });

    const balance = stripeBalance.available.reduce(
      (acc, curr) => acc + curr.amount,
      0,
    );

    console.log({
      balance,
      minWithdrawalAmount: partner.minWithdrawalAmount,
    });

    if (balance >= partner.minWithdrawalAmount) {
      let withdrawalFee = 0;

      if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
        withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;
      }

      const finalAmount = balance - withdrawalFee;

      // 3. Create a Stripe payout for the available balance
      const stripePayout = await stripe.payouts.create(
        {
          amount: finalAmount,
          currency: "usd",
          description: "Dub Partners payout",
          // method: "standard",
        },
        {
          stripeAccount: partner.stripeConnectId,
        },
      );

      console.log(
        `Stripe payout (${stripePayout.id}) created for partner ${partner.id} with amount ${currencyFormatter(finalAmount / 100)}.`,
      );
    }

    await Promise.allSettled([
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
