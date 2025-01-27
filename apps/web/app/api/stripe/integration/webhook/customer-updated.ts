import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeCustomerId = stripeCustomer.id;
  const externalId = stripeCustomer.metadata?.dubCustomerId;

  // Check if an existing Stripe customer exists
  const customerFound = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (customerFound) {
    await prisma.customer.update({
      where: {
        id: customerFound.id,
      },
      data: {
        externalId,
        name: stripeCustomer.name,
        email: stripeCustomer.email,
      },
    });

    return `Dub customer with ID ${customerFound.id} updated.`;
  }

  return await createNewCustomer(event);
}
