import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import PartnerStripePayoutFailed from "@dub/email/templates/partner-stripe-payout-failed";
import { prisma } from "@dub/prisma";
import { prettyPrint } from "@dub/utils";
import Stripe from "stripe";

export async function payoutFailed(event: Stripe.Event) {
  const stripeConnectId = event.account;

  if (!stripeConnectId) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId,
    },
    select: {
      email: true,
    },
  });

  if (!partner) {
    return `Partner not found with Stripe connect account ${stripeConnectId}. Skipping...`;
  }

  const stripePayout = event.data.object as Stripe.Payout;

  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      stripePayoutId: stripePayout.id,
    },
    data: {
      status: "failed",
      failureReason: stripePayout.failure_message,
    },
  });

  if (partner.email) {
    try {
      // Fetch bank account information
      const { data: externalAccounts } =
        await stripe.accounts.listExternalAccounts(stripeConnectId);

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
        subject: `Action Required - Your recent payout failed`,
        to: partner.email,
        react: PartnerStripePayoutFailed({
          email: partner.email,
          bankAccount,
          payout: {
            amount: stripePayout.amount,
            currency: stripePayout.currency,
            failureReason: stripePayout.failure_message,
          },
        }),
      });

      console.log(
        `Sent email to partner ${partner.email} (${stripeConnectId}): ${prettyPrint(sentEmail)}`,
      );
    } catch (error) {
      console.error(
        `Failed to send payout failed email to ${partner.email}:`,
        error,
      );
    }
  }

  return `Updated ${updatedPayouts.count} payouts for partner ${partner.email} (${stripeConnectId}) to "failed" status.`;
}
