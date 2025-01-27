import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const externalId = stripeCustomer.metadata?.dubCustomerId;

  if (externalId) {
    // Check the customer is not already created
    // Find customer using projectConnectId and externalId (the customer's ID in the client app)
    const customerFound = await prisma.customer.findUnique({
      where: {
        projectConnectId_externalId: {
          projectConnectId: stripeAccountId,
          externalId,
        },
      },
    });

    if (customerFound) {
      // if customer exists (created via /track/lead)
      // update it with the Stripe customer ID (for future reference by invoice.paid)
      await prisma.customer.update({
        where: {
          id: customerFound.id,
        },
        data: {
          stripeCustomerId: stripeCustomer.id,
          projectConnectId: stripeAccountId,
        },
      });

      return `Dub customer with ID ${customerFound.id} updated with Stripe customer ID ${stripeCustomer.id}`;
    }
  }

  // otherwise create a new customer
  return await createNewCustomer(event);
}

// customers.create -> customers.update
// /track/lead -> customers.create -> customers.update
// /track/lead -> customers.update