import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalInitiated from "@dub/email/templates/partner-payout-withdrawal-initiated";
import { prisma } from "@dub/prisma";
import { currencyFormatter, formatDate, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  stripeAccount: z.string(),
});

// POST /api/cron/payouts/balance-available
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { stripeAccount } = payloadSchema.parse(JSON.parse(rawBody));

    const partner = await prisma.partner.findUnique({
      where: {
        stripeConnectId: stripeAccount,
      },
      select: {
        email: true,
      },
    });

    if (!partner) {
      return logAndRespond(
        `Partner not found with Stripe connect account ${stripeAccount}. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    // Get the partner's current balance
    const balance = await stripe.balance.retrieve({
      stripeAccount,
    });

    // Check if there's any available balance
    if (balance.available.length === 0 || balance.available[0].amount === 0) {
      return logAndRespond(
        `No available balance found for partner ${partner.email} (${stripeAccount}). Skipping...`,
      );
    }

    const { amount, currency } = balance.available[0];

    const { data: stripePayouts } = await stripe.payouts.list(
      {
        status: "pending",
      },
      {
        stripeAccount,
      },
    );

    let availableBalance = amount;

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
      return logAndRespond(
        `The available balance (${currencyFormatter(availableBalance / 100, { currency })}) for partner ${partner.email} (${stripeAccount}) is less than or equal to 0 after subtracting pending payouts. Skipping...`,
      );
    }

    if (["huf", "twd"].includes(currency)) {
      // For HUF and TWD, Stripe requires payout amounts to be evenly divisible by 100
      // We need to round down to the nearest 100 units
      availableBalance = Math.floor(availableBalance / 100) * 100;
    }

    const stripePayout = await stripe.payouts.create(
      {
        amount: availableBalance,
        currency,
        // example: "Dub Partners auto-withdrawal (Aug 1, 2025)"
        description: `Dub Partners auto-withdrawal (${formatDate(new Date(), { month: "short" })})`,
        method: "standard",
      },
      {
        stripeAccount,
      },
    );

    console.log(
      `Stripe payout created for partner ${partner.email} (${stripeAccount}): ${stripePayout.id} (${currencyFormatter(stripePayout.amount / 100, { currency: stripePayout.currency })})`,
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
        stripePayoutId: stripePayout.id,
      },
    });

    console.log(
      `Updated ${updatedPayouts.count} payouts for partner ${partner.email} (${stripeAccount}) to have the stripePayoutId: ${stripePayout.id}`,
    );

    if (partner.email) {
      const sentEmail = await sendEmail({
        variant: "notifications",
        subject: "Your funds are on their way to your bank",
        to: partner.email,
        react: PartnerPayoutWithdrawalInitiated({
          email: partner.email,
          payout: {
            amount: stripePayout.amount,
            currency: stripePayout.currency,
            arrivalDate: stripePayout.arrival_date,
          },
        }),
      });

      console.log(
        `Sent email to partner ${partner.email} (${stripeAccount}): ${JSON.stringify(sentEmail, null, 2)}`,
      );
    }

    return logAndRespond(
      `Processed "balance.available" for partner ${partner.email} (${stripeAccount})`,
    );
  } catch (error) {
    await log({
      message: `Error handling "balance.available" ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
