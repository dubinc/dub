import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import Stripe from "stripe";

export async function balanceAvailable(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    console.error("Stripe account not found. Skipping...");
    return;
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: stripeAccount,
    },
  });

  if (!partner) {
    console.error(
      `Partner not found with stripeConnectId ${stripeAccount}. Skipping...`,
    );
    return;
  }

  // Get the latest balance
  const balance = await stripe.balance.retrieve({
    stripeAccount,
  });

  const availableBalance = balance.available.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );

  if (availableBalance < partner.minWithdrawalAmount) {
    console.log(
      `Available balance (${currencyFormatter(availableBalance / 100)}) is less than the minimum withdrawal amount (${currencyFormatter(partner.minWithdrawalAmount / 100)}). Skipping...`,
    );
    return;
  }

  let withdrawalFee = 0;

  // Decide if we need to charge a withdrawal fee for the partner
  if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
    withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;

    const transfers = await stripe.transfers.list({
      limit: 1,
      destination: stripeAccount,
    });

    if (transfers.data.length === 0) {
      console.error(
        `No transfers found for partner ${partner.id}. Skipping...`,
      );
      return;
    }

    if (transfers.data.length > 0) {
      const transfer = transfers.data[0];

      if (transfer.amount < withdrawalFee) {
        console.error(
          `Transfer amount (${currencyFormatter(transfer.amount / 100)}) is less than the withdrawal fee (${currencyFormatter(withdrawalFee / 100)}). Skipping...`,
        );
        return;
      }

      // Charge the withdrawal fee to the partner's account
      await stripe.transfers.createReversal(transfer.id, {
        amount: withdrawalFee,
        description: "Dub Partners withdrawal fee",
      });
    }
  }

  const payout = await stripe.payouts.create(
    {
      amount: availableBalance - withdrawalFee,
      currency: "usd",
      description: "Dub Partners payout",
      method: "standard",
    },
    {
      stripeAccount,
    },
  );

  console.log("Stripe payout created", payout);
}
