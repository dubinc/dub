import { getStripeOutboundPayment } from "@/lib/stripe/get-stripe-outbound-payment";
import { prisma } from "@dub/prisma";
import { pluralize } from "@dub/utils";
import Stripe from "stripe";

export async function outboundPaymentPosted(event: Stripe.ThinEvent) {
  const { related_object: relatedObject } = event;

  if (!relatedObject) {
    return "No related object found in event, skipping...";
  }

  const { id: outboundPaymentId } = relatedObject;

  const outboundPayment = await getStripeOutboundPayment(outboundPaymentId);

  const stripePayoutTraceId = outboundPayment.trace_id?.value;

  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      stripePayoutId: outboundPaymentId,
    },
    data: {
      status: "completed",
      paidAt: new Date(),
      ...(stripePayoutTraceId && {
        stripePayoutTraceId: stripePayoutTraceId,
      }),
    },
  });

  // TODO:
  // Send email notification

  return `Updated ${updatedPayouts.count} ${pluralize("payout", updatedPayouts.count)} to completed status.`;
}
