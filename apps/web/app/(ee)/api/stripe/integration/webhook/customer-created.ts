import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const dubCustomerExternalId = stripeCustomer.metadata?.dubCustomerId;

  if (!dubCustomerExternalId) {
    return "External ID not found in Stripe customer metadata, skipping...";
  }

  // Check the customer is not already created
  // Find customer using projectConnectId and externalId (the customer's ID in the client app)
  const customer = await prisma.customer.findUnique({
    where: {
      projectConnectId_externalId: {
        projectConnectId: stripeAccountId,
        externalId: dubCustomerExternalId,
      },
    },
  });

  if (customer) {
    // if customer exists (created via /track/lead)
    // update it with the Stripe customer ID (for future reference by invoice.paid)
    try {
      await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          stripeCustomerId: stripeCustomer.id,
        },
      });

      return `Dub customer with ID ${customer.id} updated with Stripe customer ID ${stripeCustomer.id}`;
    } catch (error) {
      console.error(error);
      return `Error updating Dub customer with ID ${customer.id}: ${error}`;
    }
  }

  // otherwise create a new customer
  return await createNewCustomer(event);
}
