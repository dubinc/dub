import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const externalId = stripeCustomer.metadata?.dubCustomerId;

  if (!externalId) {
    return "External ID not found in Stripe customer metadata, skipping...";
  }

  const customer = await prisma.customer.findUnique({
    where: {
      projectConnectId_externalId: {
        projectConnectId: stripeAccountId,
        externalId,
      },
    },
  });

  if (customer) {
    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        externalId,
        name: stripeCustomer.name,
        email: stripeCustomer.email,
      },
    });

    return `Dub customer with ID ${customer.id} updated.`;
  }

  // otherwise create a new customer
  return await createNewCustomer(event);
}
