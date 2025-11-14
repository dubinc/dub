import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalInitiated from "@dub/email/templates/partner-payout-withdrawal-initiated";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  currencyFormatter,
  formatDate,
  log,
} from "@dub/utils";
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

    if (balance.available.length === 0) {
      // should never happen, but just in case
      return logAndRespond(
        `Partner ${partner.email} (${stripeAccount}) has no available balance. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    let { amount: availableBalance, currency } = balance.available[0];

    // if available balance is 0, check if there's any pending balance
    if (availableBalance === 0) {
      const pendingBalance = balance.pending?.[0]?.amount ?? 0;

      // if there's a pending balance, schedule another check in 1 hour
      if (pendingBalance > 0) {
        const res = await qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/balance-available`,
          delay: 60 * 60, // check again in 1 hour
          body: {
            stripeAccount,
          },
        });
        console.log(
          `Scheduled another check for partner ${partner.email} (${stripeAccount}) in 1 hour: ${res.messageId}`,
        );

        return logAndRespond(
          `Pending balance found for partner ${partner.email} (${stripeAccount}): ${currencyFormatter(pendingBalance, { currency })}. Scheduling another check in 1 hour...`,
        );
      }

      return logAndRespond(
        `Partner ${partner.email} (${stripeAccount})'s available balance is 0. Skipping...`,
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
      `Stripe payout created for partner ${partner.email} (${stripeAccount}): ${stripePayout.id} (${currencyFormatter(stripePayout.amount, { currency: stripePayout.currency })})`,
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
        headers: {
          "Idempotency-Key": `payout-initiated-${stripePayout.id}`,
        },
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
