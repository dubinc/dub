import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function payoutPaid(event: Stripe.Event) {
  const stripeAccount = event.account;

  console.log("payoutPaid", event);

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

  // TODO:
  // Update the associated payouts on Dub to completed
}
