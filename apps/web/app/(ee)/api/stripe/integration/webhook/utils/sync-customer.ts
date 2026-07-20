import { createId } from "@/lib/api/create-id";
import { getOrCreateCustomer } from "@/lib/api/customers/get-or-create-customer";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { constructWebhookPartner } from "@/lib/partners/constuct-webhook-partner";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
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
  const dubCustomerExternalId =
    stripeCustomer.metadata?.dubCustomerExternalId ||
    stripeCustomer.metadata?.dubCustomerId;
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
        ...(stripeCustomer.email && { email: stripeCustomer.email }),
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
      programId: true,
      partnerId: true,
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
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId: dubCustomerExternalId,
      projectId: workspace.id,
      programId: link.programId,
      partnerId: link.partnerId,
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
        ...(stripeCustomer.email && { email: stripeCustomer.email }),
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
      let webhookPartner:
        | ReturnType<typeof constructWebhookPartner>
        | undefined;

      if (link.programId && link.partnerId) {
        const programEnrollment = await prisma.programEnrollment.findUnique({
          where: {
            partnerId_programId: {
              partnerId: link.partnerId,
              programId: link.programId,
            },
          },
          include: {
            partner: true,
            links: true,
          },
        });

        webhookPartner = programEnrollment
          ? constructWebhookPartner(programEnrollment)
          : undefined;

        await Promise.allSettled([
          executeWorkflows({
            trigger: "partnerMetricsUpdated",
            reason: "lead",
            identity: {
              workspaceId: workspace.id,
              programId: link.programId,
              partnerId: link.partnerId,
            },
            metrics: {
              current: {
                leads: 1,
              },
            },
          }),

          syncPartnerLinksStats({
            partnerId: link.partnerId,
            programId: link.programId,
            eventType: "lead",
          }),

          sendPartnerPostback({
            partnerId: link.partnerId,
            event: "lead.created",
            data: {
              ...clickData,
              eventName,
              link: linkUpdated,
              customer,
            },
          }),
        ]);
      }

      await sendWorkspaceWebhook({
        trigger: "lead.created",
        workspace,
        data: transformLeadEventData({
          ...clickData,
          eventName,
          link: linkUpdated,
          customer,
          partner: webhookPartner,
          metadata: null,
        }),
      });
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
