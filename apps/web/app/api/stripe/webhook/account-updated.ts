import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled } = account;

  await prisma.partner.update({
    where: {
      stripeConnectId: account.id,
    },
    data: {
      country,
      payoutsEnabled: payouts_enabled,
    },
  });
}
