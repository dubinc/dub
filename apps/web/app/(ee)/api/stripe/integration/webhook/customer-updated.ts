import { prisma } from "@dub/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils/create-new-customer";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.Event) {
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
    try {
      await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          name: stripeCustomer.name,
          email: stripeCustomer.email,
          externalId: dubCustomerExternalId,
          stripeCustomerId: stripeCustomer.id,
          projectConnectId: stripeAccountId,
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
