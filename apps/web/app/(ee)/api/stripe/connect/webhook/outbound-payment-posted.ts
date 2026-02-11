import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function outboundPaymentPosted(event: Stripe.Event) {
  const parsedEvent = stripeV2ThinEventSchema.parse(event);

  const outboundPaymentId = parsedEvent.related_object.id;

  const payout = await prisma.payout.findUnique({
    where: {
      stripeOutboundPaymentId: outboundPaymentId,
    },
    select: {
      id: true,
    },
  });

  if (!payout) {
    return `Payout not found for outbound payment ${outboundPaymentId}, skipping...`;
  }

  const updatedPayout = await prisma.payout.update({
    where: {
      id: payout.id,
    },
    data: {
      status: "completed",
      paidAt: new Date(),
    },
  });

  await prisma.commission.updateMany({
    where: {
      payoutId: payout.id,
    },
    data: {
      status: "paid",
    },
  });

  return `Updated payout ${updatedPayout.id} to completed status.`;
}
