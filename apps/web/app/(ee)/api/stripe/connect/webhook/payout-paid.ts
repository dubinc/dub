import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalCompleted from "@dub/email/templates/partner-payout-withdrawal-completed";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function payoutPaid(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: stripeAccount,
    },
  });

  if (!partner) {
    return `Partner not found with Stripe connect account ${stripeAccount}. Skipping...`;
  }

  const stripePayout = event.data.object as Stripe.Payout;

  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      status: "sent",
      stripePayoutId: stripePayout.id,
    },
    data: {
      status: "completed",
    },
  });

  if (partner.email) {
    const sentEmail = await sendEmail({
      variant: "notifications",
      subject: "Your funds have been transferred to your bank account",
      to: partner.email,
      react: PartnerPayoutWithdrawalCompleted({
        email: partner.email,
        payout: {
          amount: stripePayout.amount,
          currency: stripePayout.currency,
          arrivalDate: stripePayout.arrival_date,
          traceId:
            typeof stripePayout.trace_id === "string"
              ? stripePayout.trace_id
              : null,
        },
      }),
    });

    console.log(
      `Sent email to partner ${partner.email} (${stripeAccount}): ${JSON.stringify(sentEmail, null, 2)}`,
    );
  }

  return `Updated ${updatedPayouts.count} payouts for partner ${partner.email} (${stripeAccount}) to "completed" status`;
}
