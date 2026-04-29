import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import type Stripe from "stripe";

export function productIdFromLineItemPrice(
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

export async function getCheckoutSessionProductIds({
  checkoutSessionId,
  stripeAccountId,
  mode,
}: {
  checkoutSessionId: string;
  stripeAccountId?: string | null;
  mode: StripeMode;
}): Promise<string[] | null> {
  if (!stripeAccountId) {
    return null;
  }

  try {
    const stripeApp = stripeAppClient({
      mode,
    });

    const lineItems = await stripeApp.checkout.sessions.listLineItems(
      checkoutSessionId,
      {
        expand: ["data.price.product"],
        limit: 10,
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    if (lineItems.data.length === 0) {
      console.log(
        `[getCheckoutSessionProductIds] No line items found for checkout session ${checkoutSessionId}.`,
      );
      return null;
    }

    const productIds = lineItems.data
      .map((item) => productIdFromLineItemPrice(item.price))
      .filter((productId) => productId !== null);

    if (productIds.length === 0) {
      console.log(
        `[getCheckoutSessionProductIds] No valid product IDs found for checkout session ${checkoutSessionId}.`,
      );
      return null;
    }

    return productIds;
  } catch (error) {
    console.log(
      "[getCheckoutSessionProductIds] Failed to get checkout session product ID:",
      error,
    );
    return null;
  }
}
