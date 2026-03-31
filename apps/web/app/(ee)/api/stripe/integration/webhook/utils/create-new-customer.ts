import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { sendPartnerPostback } from "@/lib/postback/api/send-partner-postback";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

export async function createNewCustomer(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const dubCustomerExternalId =
    stripeCustomer.metadata?.dubCustomerExternalId ||
    stripeCustomer.metadata?.dubCustomerId;
  const clickId = stripeCustomer.metadata?.dubClickId;

  // The client app should always send dubClickId (dub_id) via metadata
  if (!clickId) {
    return "Click ID not found in Stripe customer metadata, skipping...";
  }

  // Find click
  const clickData = await getClickEvent({ clickId });
  if (!clickData) {
    return `Click event with ID ${clickId} not found, skipping...`;
  }

  // Find link
  const linkId = clickData.link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link || !link.projectId) {
    return `Link with ID ${linkId} not found or does not have a project, skipping...`;
  }

  // Create a customer
  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      name: stripeCustomer.name || generateRandomName(),
      email: stripeCustomer.email,
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId: dubCustomerExternalId,
      projectId: link.projectId,
      programId: link.programId,
      partnerId: link.partnerId,
      linkId,
      clickId,
      clickedAt: new Date(clickData.timestamp + "Z"),
      country: clickData.country,
    },
  });

  const eventName = "New customer";

  const leadData = {
    ...clickData,
    workspace_id: clickData.workspace_id || customer.projectId, // in case for some reason the click event doesn't have workspace_id
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
  };

  const [_lead, _leadCached, linkUpdated, workspace] = await Promise.all([
    // record lead event in Tinybird
    recordLead(leadData),

    // cache lead event in Redis because the ingested event is not available immediately on Tinybird
    redis.set(`leadCache:${customer.id}`, leadData, {
      ex: 60 * 5,
    }),

    // update link leads count + lastLeadAt date
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

    // update workspace usage
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

  if (link.programId && link.partnerId) {
    waitUntil(
      Promise.allSettled([
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
      ]),
    );
  }

  // send workspace webhook
  waitUntil(
    Promise.allSettled([
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

      ...(link.partnerId
        ? [
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
          ]
        : []),
    ]),
  );

  return `New Dub customer created: ${customer.id}. Lead event recorded: ${leadData.event_id}`;
}
