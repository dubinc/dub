import { stripe } from "@/lib/stripe";

export const retrieveSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // TODO:
    // What if there are multiple items in the subscription?

    const price = subscription.items.data[0].price;

    return {
      productId: price.product as string,
      recurring: price.type === "recurring" ? 1 : 0,
      recurringInterval: price.recurring?.interval as string,
      recurringIntervalCount: price.recurring?.interval_count as number,
    };
  } catch (error) {
    return null;
  }
};
