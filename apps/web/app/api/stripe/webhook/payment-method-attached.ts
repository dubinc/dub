import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function paymentMethodAttached(event: Stripe.Event) {
  const { id, customer, type } = event.data.object as Stripe.PaymentMethod;

  if (type !== "us_bank_account") {
    return;
  }

  await prisma.project.update({
    where: {
      stripeId: customer as string,
    },
    data: {
      payoutMethodId: id,
    },
    select: {
      id: true,
      invoicePrefix: true,
    },
  });
}
