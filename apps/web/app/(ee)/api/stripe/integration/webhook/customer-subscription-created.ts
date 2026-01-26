import { trackLead } from "@/lib/api/conversions/track-lead";
import { StripeMode } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Customer } from "@dub/prisma/client";
import { pick, STRIPE_INTEGRATION_ID } from "@dub/utils";
import type Stripe from "stripe";
import { getConnectedCustomer } from "./utils/get-connected-customer";

// Handle event "customer.subscription.created"
// only used for recording free trial creations
export async function customerSubscriptionCreated(
  event: Stripe.Event,
  mode: StripeMode,
) {
  const createdSubscription = event.data.object as Stripe.Subscription;

  if (createdSubscription.status !== "trialing") {
    return "Subscription is not in trialing status, skipping...";
  }

  const stripeAccountId = event.account as string;
  const stripeCustomerId = createdSubscription.customer as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      slug: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
      installedIntegrations: {
        where: {
          integrationId: STRIPE_INTEGRATION_ID,
        },
      },
    },
  });

  if (!workspace) {
    return `Workspace with stripeConnectId ${stripeAccountId} not found, skipping...`;
  }

  if (!workspace.installedIntegrations.length) {
    return `Workspace ${workspace.slug} has no Stripe integration installed, skipping...`;
  }

  const stripeIntegration = workspace.installedIntegrations[0];

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

    if (stripeCustomer) {
      customer = await prisma.customer.findFirst({
        where: {
          projectId: workspace.id,
          email: stripeCustomer.email,
        },
      });

      if (!customer) {
        // this should never happen, but just in case
        return `Customer ${stripeCustomer.id} with email ${stripeCustomer.email} has not been tracked yet, skipping...`;
      }
    } else {
      // this should never happen, but just in case
      return `Customer with stripeCustomerId ${stripeCustomerId} not found, skipping...`;
    }
  }

  if (!customer.clickId || !customer.externalId) {
    return `Customer ${customer.id} has no clickId or externalId, skipping...`;
  }

  await trackLead({
    clickId: customer.clickId,
    eventName: "Started Trial",
    customerExternalId: customer.externalId,
    customerName: customer.name,
    customerEmail: customer.email,
    eventQuantity: 1, //
    rawBody: {},
    workspace: pick(workspace, ["id", "stripeConnectId", "webhookEnabled"]),
    source: "trial",
  });

  return `Customer subscription created for customer ${customer.id} with stripeCustomerId ${stripeCustomerId} and workspace ${workspace.slug}`;
}
