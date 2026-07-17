import { trackLead } from "@/lib/api/conversions/track-lead";
import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { prisma } from "@/lib/prisma";
import { pick, STRIPE_INTEGRATION_ID } from "@dub/utils";
import { Customer } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";
import { getConnectedCustomer } from "./utils/get-connected-customer";

// Handle event "customer.subscription.created"
// only used for recording free trial creations
export async function customerSubscriptionCreated({
  event,
  mode,
  workspace,
}: WebhookHandlerInput<Stripe.CustomerSubscriptionCreatedEvent>): Promise<WebhookHandlerResponse> {
  const createdSubscription = event.data.object;

  if (createdSubscription.status !== "trialing") {
    return {
      response: "Subscription is not in trialing status, skipping...",
    };
  }

  const stripeAccountId = event.account as string;
  const stripeCustomerId = createdSubscription.customer as string;

  const installedIntegration = await prisma.installedIntegration.findFirst({
    where: {
      projectId: workspace.id,
      integrationId: STRIPE_INTEGRATION_ID,
    },
  });

  if (!installedIntegration) {
    return {
      response: `Workspace ${workspace.id} has no Stripe integration installed, skipping...`,
    };
  }

  const stripeIntegrationSettings = stripeIntegrationSettingsSchema.parse(
    installedIntegration.settings || {},
  );

  if (!stripeIntegrationSettings?.freeTrials?.enabled) {
    return {
      response: `Stripe free trial tracking is not enabled for workspace ${workspace.id}, skipping...`,
    };
  }

  let customer: Customer | null = null;

  // find customer by stripeCustomerId or email
  customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  if (!customer) {
    const stripeCustomer = await getConnectedCustomer({
      stripeCustomerId,
      stripeAccountId,
      mode,
    });

    if (stripeCustomer?.email) {
      customer = await prisma.customer.findFirst({
        where: {
          projectId: workspace.id,
          email: stripeCustomer.email,
        },
      });

      if (!customer) {
        // this should never happen, but just in case
        return {
          response: `Customer ${stripeCustomer.id} with email ${stripeCustomer.email} has not been tracked yet, skipping...`,
        };
      }
      // update the customer with the Stripe customer ID (for future reference by invoice.paid)
      waitUntil(
        prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            stripeCustomerId,
          },
        }),
      );
    } else {
      // this should never happen either, but just in case
      return {
        response: `Customer with stripeCustomerId ${stripeCustomerId} ${stripeCustomer ? "does not have an email on Stripe" : "does not exist"}, skipping...`,
      };
    }
  }

  if (!customer.clickId) {
    return {
      response: `Customer ${customer.id} has no clickId, skipping...`,
    };
  }

  if (!customer.externalId) {
    return {
      response: `Customer ${customer.id} has no externalId, skipping...`,
    };
  }

  // if trackQuantity is enabled, use the quantity from the main subscription item
  // (e.g. for a 3-seat free trial, the event quantity will be 3)
  const eventQuantity = stripeIntegrationSettings.freeTrials.trackQuantity
    ? createdSubscription.items.data[0].quantity
    : 1;

  await trackLead({
    clickId: customer.clickId,
    eventName: "Started Trial",
    customerExternalId: customer.externalId,
    customerName: customer.name,
    customerEmail: customer.email,
    eventQuantity,
    workspace: pick(workspace, ["id", "stripeConnectId", "webhookEnabled"]),
    source: "trial",
  });

  return {
    response: `Customer subscription created for customer ${customer.id} with stripeCustomerId ${stripeCustomerId} and workspace ${workspace.id}`,
  };
}
