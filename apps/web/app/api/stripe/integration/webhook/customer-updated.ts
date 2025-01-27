import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeCustomerId = stripeCustomer.id;

  // An existing customer found with valid stripeCustomerId
  const customerFound = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  // update the customer
  if (customerFound) {
    await prisma.customer.update({
      where: {
        id: customerFound.id,
      },
      data: {
        name: stripeCustomer.name,
        email: stripeCustomer.email,
      },
    });

    return `Dub customer with ID ${customerFound.id} updated.`;
  }

  // Let's check if the metadata has the dubClickId and dubCustomerId if it does, we can create a new customer
  return await createNewCustomer(event);
}
