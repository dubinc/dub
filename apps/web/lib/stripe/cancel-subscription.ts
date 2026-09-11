import { stripe } from ".";

export async function cancelSubscription({
  customerId,
  reason,
  immediateCancellation = false,
}: {
  customerId: string;
  reason?: string;
  immediateCancellation?: boolean;
}) {
  try {
    const subscriptionId = await stripe.subscriptions
      .list({
        customer: customerId,
      })
      .then((res) => res.data[0].id);

    if (immediateCancellation) {
      return await stripe.subscriptions.cancel(subscriptionId);
    }

    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: reason || "Customer deleted their Dub workspace.",
      },
    });
  } catch (error) {
    console.log("Error cancelling Stripe subscription", error);
    return;
  }
}
