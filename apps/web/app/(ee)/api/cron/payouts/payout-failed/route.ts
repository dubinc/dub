import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalFailed from "@dub/email/templates/partner-payout-withdrawal-failed";
import { prisma } from "@dub/prisma";
import { log, pluralize, prettyPrint } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

const payloadSchema = z.object({
  stripeAccount: z.string(),
  stripePayout: z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    failureMessage: z.string().nullable(),
  }),
});

// POST /api/cron/payouts/payout-failed
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { stripeAccount, stripePayout } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

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
      );
    }

    const updatedPayouts = await prisma.payout.updateMany({
      where: {
        stripePayoutId: stripePayout.id,
      },
      data: {
        status: "failed",
        failureReason: stripePayout.failureMessage,
      },
    });

    if (partner.email) {
      try {
        // Fetch bank account information
        const { data: externalAccounts } =
          await stripe.accounts.listExternalAccounts(stripeAccount);

        const defaultExternalAccount = externalAccounts.find(
          (account) =>
            account.default_for_currency && account.object === "bank_account",
        );

        const bankAccount =
          defaultExternalAccount &&
          defaultExternalAccount.object === "bank_account"
            ? {
                account_holder_name: defaultExternalAccount.account_holder_name,
                bank_name: defaultExternalAccount.bank_name,
                last4: defaultExternalAccount.last4,
                routing_number: defaultExternalAccount.routing_number,
              }
            : undefined;

        const sentEmail = await sendEmail({
          variant: "notifications",
          subject: `[Action Required]: Your recent Dub auto-withdrawal failed`,
          to: partner.email,
          react: PartnerPayoutWithdrawalFailed({
            email: partner.email,
            bankAccount,
            payout: {
              amount: stripePayout.amount,
              currency: stripePayout.currency,
              failureReason: stripePayout.failureMessage,
            },
          }),
        });

        console.log(
          `Sent email to partner ${partner.email} (${stripeAccount}): ${prettyPrint(sentEmail)}`,
        );
      } catch (error) {
        console.error(
          `Failed to send payout failed email to ${partner.email}:`,
          error,
        );
      }
    }

    return logAndRespond(
      `Updated ${updatedPayouts.count} ${pluralize("payout", updatedPayouts.count)} for partner ${partner.email} (${stripeAccount}) to "failed" status.`,
    );
  } catch (error) {
    await log({
      message: `Error handling "payout.failed" ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
