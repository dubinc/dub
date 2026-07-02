import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { createNewCustomer } from "./utils/create-new-customer";
import { StripeWebhookInput, StripeWebhookOutput } from "./utils/types";

// Handle event "customer.updated"
export async function customerUpdated({
  event,
  workspace,
}: Omit<StripeWebhookInput, "mode"> & {
  event: Stripe.CustomerUpdatedEvent;
}): Promise<StripeWebhookOutput> {
  const stripeCustomer = event.data.object;
  const dubCustomerExternalId =
    stripeCustomer.metadata?.dubCustomerExternalId ||
    stripeCustomer.metadata?.dubCustomerId;

  if (!dubCustomerExternalId) {
    return {
      response:
        "External ID not found in Stripe customer metadata, skipping...",
    };
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
          projectConnectId: workspace.stripeConnectId,
        },
      });

      return {
        response: `Dub customer with ID ${customer.id} updated.`,
      };
    } catch (error) {
      console.error(error);
      return {
        response: `Error updating Dub customer with ID ${customer.id}: ${error}`,
      };
    }
  }

  // otherwise create a new customer
  return await createNewCustomer(event);
}
