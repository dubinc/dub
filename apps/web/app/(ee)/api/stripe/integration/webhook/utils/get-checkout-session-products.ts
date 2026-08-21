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

export async function getCheckoutSessionProducts({
  checkoutSessionId,
  stripeAccountId,
  mode,
}: {
  checkoutSessionId: string;
  stripeAccountId?: string | null;
  mode: StripeMode;
}) {
  if (!stripeAccountId) {
    return [];
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
        `[getCheckoutSessionProducts] No line items found for checkout session ${checkoutSessionId}.`,
      );
      return [];
    }

    const products = lineItems.data
      .map((line) => {
        const productId = productIdFromLineItemPrice(line.price);

        if (!productId) return null;

        return {
          id: productId,
          amount: line.amount_total,
          quantity: line.quantity,
        };
      })
      .filter(
        (p): p is { id: string; amount: number; quantity: number } =>
          p !== null && p.quantity !== null,
      );

    if (products.length === 0) {
      console.log(
        `[getCheckoutSessionProducts] No valid products found for checkout session ${checkoutSessionId}.`,
      );
      return [];
    }

    return products;
  } catch (error) {
    console.log(
      "[getCheckoutSessionProducts] Failed to get checkout session products:",
      error,
    );
    return [];
  }
}
