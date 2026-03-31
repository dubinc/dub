import { getStripeOutboundPayment } from "@/lib/stripe/get-stripe-outbound-payment";
import { OUTBOUND_PAYMENT_FAILURE_REASONS } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import { pluralize } from "@dub/utils";
import Stripe from "stripe";

export async function outboundPaymentFailed(event: Stripe.ThinEvent) {
  const { related_object: relatedObject } = event;

  if (!relatedObject) {
    return "No related object found in event, skipping...";
  }

  const { id: outboundPaymentId } = relatedObject;

  const outboundPayment = await getStripeOutboundPayment(outboundPaymentId);

  const rawFailureReason = outboundPayment.status_details?.failed?.reason;
  const failureReason = rawFailureReason
    ? OUTBOUND_PAYMENT_FAILURE_REASONS[rawFailureReason]
    : undefined;

  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      stripePayoutId: outboundPaymentId,
    },
    data: {
      status: "failed",
      failureReason,
    },
  });

  // TODO:
  // Send email notification

  return `Updated ${updatedPayouts.count} ${pluralize("payout", updatedPayouts.count)} to failed status.`;
}
