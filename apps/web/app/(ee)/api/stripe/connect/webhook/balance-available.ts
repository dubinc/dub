import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalInitiated from "@dub/email/templates/partner-payout-withdrawal-initiated";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import Stripe from "stripe";

export async function balanceAvailable(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    console.error(
      `Stripe connect account ${stripeAccount} not found. Skipping...`,
    );
    return;
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: stripeAccount,
    },
  });

  if (!partner) {
    console.error(
      `Partner not found with Stripe connect account ${stripeAccount}. Skipping...`,
    );
    return;
  }

  // Get the partner's current balance
  const balance = await stripe.balance.retrieve({
    stripeAccount,
  });

  // Check if there's any available balance
  if (balance.available.length === 0 || balance.available[0].amount === 0) {
    console.log(
      `No available balance found for partner ${partner.email} (${stripeAccount}). Skipping...`,
    );
    return;
  }

  const { amount, currency } = balance.available[0];
  let availableBalance = amount;

  const { data: stripePayouts } = await stripe.payouts.list(
    {
      status: "pending",
    },
    {
      stripeAccount,
    },
  );

  // Subtract the pending/in-transit payouts from the available balance
  if (stripePayouts.length > 0) {
    const pendingOrInTransitPayouts = stripePayouts.filter(
      ({ status }) => status === "pending" || status === "in_transit",
    );

    const alreadyPaidOutAmount = pendingOrInTransitPayouts.reduce(
      (acc, payout) => acc + payout.amount,
      0,
    );

    availableBalance = availableBalance - alreadyPaidOutAmount;
  }

  if (availableBalance <= 0) {
    console.log(
      `The available balance (${currencyFormatter(availableBalance / 100, { maximumFractionDigits: 2, currency })}) for partner ${partner.email} (${stripeAccount}) is less than or equal to 0 after subtracting pending payouts. Skipping...`,
    );
    return;
  }

  if (["huf", "twd"].includes(currency)) {
    // For HUF and TWD, Stripe requires payout amounts to be evenly divisible by 100
    // We need to round down to the nearest 100 units
    availableBalance = Math.floor(availableBalance / 100) * 100;
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

  console.log(
    `Stripe payout created for partner ${partner.email} (${stripeAccount}): ${payout.id} (${currencyFormatter(payout.amount / 100, { maximumFractionDigits: 2, currency })})`,
  );

  const transfers = await stripe.transfers.list({
    destination: stripeAccount,
    limit: 100,
  });

  // update all payouts that match the following criteria to have the stripePayoutId:
  // - in the "sent" status
  // - have a stripe transfer id (meaning it was transferred to this connected account)
  // - no stripe payout id (meaning it was not yet withdrawn to the connected bank account)
  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      status: "sent",
      stripePayoutId: null,
      stripeTransferId: {
        in: transfers.data.map(({ id }) => id),
      },
    },
    data: {
      stripePayoutId: payout.id,
    },
  });

  console.log(
    `Updated ${updatedPayouts.count} payouts for partner ${partner.email} (${stripeAccount}) to have the stripePayoutId: ${payout.id}`,
  );

  if (partner.email) {
    const sentEmail = await sendEmail({
      variant: "notifications",
      subject: "Your funds are on their way to your bank",
      email: partner.email,
      react: PartnerPayoutWithdrawalInitiated({
        email: partner.email,
        amount: payout.amount,
      }),
    });

    console.log(
      `Sent email to partner ${partner.email} (${stripeAccount}): ${JSON.stringify(sentEmail, null, 2)}`,
    );
  }
}
