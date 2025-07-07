import { ZERO_DECIMAL_CURRENCIES } from "@/lib/analytics/convert-currency";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/upstash";
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

  // Get the partner's current balance
  const balance = await stripe.balance.retrieve({
    stripeAccount,
  });

  const { amount, currency } = balance.available[0];
  let availableBalance = amount;

  if (currency !== "usd") {
    const fxRates = await redis.hget("fxRates:usd", currency.toUpperCase());

    if (!fxRates) {
      console.error(
        `Failed to get exchange rate from Redis for ${currency}. Skipping...`,
      );
      return;
    }

    let convertedUsdAmount = availableBalance / Number(fxRates);

    const isZeroDecimalCurrency = ZERO_DECIMAL_CURRENCIES.includes(
      currency.toUpperCase(),
    );

    if (isZeroDecimalCurrency) {
      convertedUsdAmount = convertedUsdAmount * 100;
    }

    if (convertedUsdAmount < partner.minWithdrawalAmount) {
      console.log(
        `Available balance (${currencyFormatter(convertedUsdAmount / 100)}) is less than the minimum withdrawal amount (${currencyFormatter(partner.minWithdrawalAmount / 100)}). Skipping...`,
      );
      return;
    }
  }

  let withdrawalFee = 0;

  // Decide if we need to charge a withdrawal fee for the partner
  if (partner.minWithdrawalAmount < MIN_WITHDRAWAL_AMOUNT_CENTS) {
    withdrawalFee = BELOW_MIN_WITHDRAWAL_FEE_CENTS;

    const transfers = await stripe.transfers.list({
      destination: stripeAccount,
    });

    if (transfers.data.length === 0) {
      console.error(
        `No transfers found for partner ${partner.id}. Skipping...`,
      );
      return;
    }

    // Find the latest transfer that's large enough to cover the withdrawal fee
    const suitableTransfer = transfers.data
      .filter((transfer) => transfer.amount >= withdrawalFee)
      .sort((a, b) => b.created - a.created)[0];

    if (!suitableTransfer) {
      console.error(
        `No transfer found with amount >= withdrawal fee (${currencyFormatter(withdrawalFee / 100)}). Available transfers: ${transfers.data
          .map((t) => currencyFormatter(t.amount / 100))
          .join(", ")}. Skipping...`,
      );
      return;
    }

    // Charge the withdrawal fee to the partner's account
    await stripe.transfers.createReversal(suitableTransfer.id, {
      amount: withdrawalFee,
      description: "Dub Partners withdrawal fee",
    });

    // If the withdrawal fee was charged, we need to fetch the partner's updated balance
    const updatedBalance = await stripe.balance.retrieve({
      stripeAccount,
    });

    availableBalance = updatedBalance.available[0].amount;
  }

  const payout = await stripe.payouts.create(
    {
      amount: availableBalance,
      currency,
      description: "Dub Partners payout",
      method: "standard",
    },
    {
      stripeAccount,
    },
  );

  console.log("Stripe payout created", payout);
}
