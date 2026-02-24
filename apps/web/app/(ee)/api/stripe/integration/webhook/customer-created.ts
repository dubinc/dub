import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils/create-new-customer";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const dubCustomerExternalId =
    stripeCustomer.metadata?.dubCustomerExternalId ||
    stripeCustomer.metadata?.dubCustomerId;

  if (!dubCustomerExternalId) {
    return "External ID not found in Stripe customer metadata, skipping...";
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return "Workspace not found, skipping...";
  }

  // Check the customer is not already created
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        {
          projectId: workspace.id,
          externalId: dubCustomerExternalId,
        },
        {
          stripeCustomerId: stripeCustomer.id,
        },
      ],
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
          externalId: dubCustomerExternalId,
          stripeCustomerId: stripeCustomer.id,
          projectConnectId: stripeAccountId,
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
