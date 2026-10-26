import { createId } from "@/lib/api/create-id";
import { getOrCreateCustomer } from "@/lib/api/customers/get-or-create-customer";
import { includeTags } from "@/lib/api/links/include-tags";
import { getNormalizedEmail } from "@/lib/email/normalize-email";
import { queueGoogleAdsConversionUpload } from "@/lib/integrations/google-ads/upload-conversion";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { nanoid, pick } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "../types";
import { getDubCustomerExternalIdFromMetadata } from "./get-dub-customer-external-id-from-metadata";

export async function syncCustomer({
  event,
  workspace,
}: Omit<
  WebhookHandlerInput<
    Stripe.CustomerCreatedEvent | Stripe.CustomerUpdatedEvent
  >,
  "mode"
>): Promise<WebhookHandlerResponse> {
  const stripeCustomer = event.data.object;
  const stripeAccountId = workspace.stripeConnectId!;
  const dubCustomerExternalId = getDubCustomerExternalIdFromMetadata(
    stripeCustomer.metadata,
  );
  const clickId = stripeCustomer.metadata?.dubClickId;

  console.log(
    "Stripe customer",
    pick(stripeCustomer, ["id", "name", "metadata"]),
  );

  if (!dubCustomerExternalId) {
    return {
      response:
        "External ID not found in Stripe customer metadata, skipping...",
    };
  }

  const existingCustomer = await prisma.customer.findFirst({
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

  // Existing customer found, update it
  if (existingCustomer) {
    return updateStripeCustomer({
      workspaceId: workspace.id,
      customerId: existingCustomer.id,
      data: {
        stripeCustomerId: stripeCustomer.id,
        projectConnectId: stripeAccountId,
        externalId: dubCustomerExternalId,
        // Only update name/email when Stripe provides non-empty values
        ...(stripeCustomer.name && { name: stripeCustomer.name }),
        ...(stripeCustomer.email && {
          email: stripeCustomer.email,
          normalizedEmail: getNormalizedEmail(stripeCustomer.email),
        }),
      },
    });
  }

  // No existing customer found, see if we can create a new one

  if (!clickId) {
    return {
      response: "Click ID not found in Stripe customer metadata, skipping...",
    };
  }

  const clickData = await getClickEvent({
    clickId,
  });

  if (!clickData) {
    return {
      response: `Click event with ID ${clickId} not found, skipping...`,
    };
  }

  const linkId = clickData.link_id;

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      projectId: true,
    },
  });

  if (!link || !link.projectId) {
    return {
      response: `Link with ID ${linkId} not found or does not have a project, skipping...`,
    };
  }

  if (link.projectId !== workspace.id) {
    return {
      response: `Link ${linkId} does not belong to workspace ${workspace.id}, skipping...`,
    };
  }

  const { customer, created } = await getOrCreateCustomer({
    findMode: "first",
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
    create: {
      id: createId({ prefix: "cus_" }),
      name: stripeCustomer.name || stripeCustomer.email || generateRandomName(),
      email: stripeCustomer.email,
      normalizedEmail: getNormalizedEmail(stripeCustomer.email),
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId: dubCustomerExternalId,
      projectId: workspace.id,
      linkId,
      clickId,
      clickedAt: new Date(clickData.timestamp + "Z"),
      country: clickData.country,
    },
  });

  // If the customer was not created, it means it already exists
  // Eg: concurrently created by two different webhooks events
  if (!created) {
    return updateStripeCustomer({
      workspaceId: workspace.id,
      customerId: customer.id,
      data: {
        stripeCustomerId: stripeCustomer.id,
        projectConnectId: stripeAccountId,
        externalId: dubCustomerExternalId,
        // Only update name/email when Stripe provides non-empty values
        ...(stripeCustomer.name && { name: stripeCustomer.name }),
        ...(stripeCustomer.email && {
          email: stripeCustomer.email,
          normalizedEmail: getNormalizedEmail(stripeCustomer.email),
        }),
      },
    });
  }

  // Track lead event for the new customer
  const eventName = "New customer";

  const leadData = {
    ...clickData,
    workspace_id: workspace.id,
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
  };

  const [_lead, _leadCached, linkUpdated] = await Promise.all([
    recordLead(leadData),

    redis.set(`leadCache:${customer.id}`, leadData, {
      ex: 60 * 5,
    }),

    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        leads: {
          increment: 1,
        },
        lastLeadAt: new Date(),
      },
      include: includeTags,
    }),

    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),
  ]);

  waitUntil(
    (async () => {
      await Promise.allSettled([
        sendWorkspaceWebhook({
          trigger: "lead.created",
          workspace,
          data: transformLeadEventData({
            ...clickData,
            eventName,
            link: linkUpdated,
            customer,
            metadata: null,
          }),
        }),
        queueGoogleAdsConversionUpload({
          workspaceId: workspace.id,
          eventType: "lead",
          eventId: leadData.event_id,
          eventName: leadData.event_name,
          conversionDateTime: new Date().toISOString(),
          conversionCount: 1,
          click: {
            id: clickData.click_id,
            url: clickData.url,
          },
        }),
      ]);
    })(),
  );

  return {
    response: `New Dub customer created: ${customer.id}. Lead event recorded: ${leadData.event_id}`,
  };
}

async function updateStripeCustomer({
  customerId,
  data,
}: {
  customerId: string;
  workspaceId: string;
  data: Prisma.CustomerUncheckedUpdateInput;
}): Promise<{ response: string }> {
  try {
    await prisma.customer.update({
      where: {
        id: customerId,
      },
      data,
    });

    return {
      response: `Dub customer with ID ${customerId} updated.`,
    };
  } catch (error) {
    return {
      response: `Error updating Dub customer with ID ${customerId}: ${error}`,
    };
  }
}
