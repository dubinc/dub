import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import type Stripe from "stripe";

function productIdFromLineItemPrice(
  price: Stripe.Price | string | null | undefined,
): string | null {
  if (!price || typeof price === "string") {
    return null;
  }

  if (!price.product) {
    return null;
  }

  const product = price.product;

  if (typeof product === "string") {
    return product;
  }

  if ("deleted" in product && product.deleted) {
    return null;
  }

  return product.id;
}

export async function getCheckoutSessionProductId({
  checkoutSessionId,
  stripeAccountId,
  mode,
}: {
  checkoutSessionId: string;
  stripeAccountId?: string | null;
  mode: StripeMode;
}): Promise<string | null> {
  if (!stripeAccountId) {
    return null;
  }

  try {
    const lineItems = await stripeAppClient({
      mode,
    }).checkout.sessions.listLineItems(
      checkoutSessionId,
      {
        expand: ["data.price.product"],
        limit: 10,
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    for (const item of lineItems.data) {
      const productId = productIdFromLineItemPrice(item.price);
      if (productId) {
        return productId;
      }
    }

    return null;
  } catch (error) {
    console.log("Failed to get checkout session product ID:", error);
    return null;
  }
}
