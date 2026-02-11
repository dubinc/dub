import { getStripeOutboundPayment } from "@/lib/stripe/get-stripe-outbound-payment";
import {
  OUTBOUND_PAYMENT_FAILURE_REASONS,
  stripeV2ThinEventSchema,
} from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function outboundPaymentFailed(event: Stripe.Event) {
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

  const outboundPayment = await getStripeOutboundPayment(outboundPaymentId);

  const rawFailureReason = outboundPayment.status_details?.failed.reason;
  const failureReason = rawFailureReason
    ? OUTBOUND_PAYMENT_FAILURE_REASONS[rawFailureReason]
    : undefined;

  const updatedPayout = await prisma.payout.update({
    where: {
      id: payout.id,
    },
    data: {
      status: "failed",
      failureReason,
    },
  });

  return `Updated payout ${updatedPayout.id} to failed status.`;
}
