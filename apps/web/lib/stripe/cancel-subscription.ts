import { stripe } from ".";

export async function cancelSubscription({
  customerId,
  reason,
}: {
  customerId: string;
  reason?: string;
}) {
  try {
    const subscriptionId = await stripe.subscriptions
      .list({
        customer: customerId,
      })
      .then((res) => res.data[0].id);

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
