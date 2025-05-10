import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const dubCustomerExternalId = stripeCustomer.metadata?.dubCustomerId;

  if (!dubCustomerExternalId) {
    return "External ID not found in Stripe customer metadata, skipping...";
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        {
          projectConnectId: stripeAccountId,
          externalId: dubCustomerExternalId,
        },
        {
          stripeCustomerId: stripeCustomer.id,
        },
      ],
    },
  });

  if (customer) {
    try {
      await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          externalId: dubCustomerExternalId,
          stripeCustomerId: stripeCustomer.id,
          name: stripeCustomer.name,
          email: stripeCustomer.email,
        },
      });

      return `Dub customer with ID ${customer.id} updated.`;
    } catch (error) {
      console.error(error);
      return `Error updating Dub customer with ID ${customer.id}: ${error}`;
    }
  }

  // otherwise create a new customer
  return await createNewCustomer(event);
}
