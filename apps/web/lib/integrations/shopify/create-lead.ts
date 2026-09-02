import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { generateRandomName } from "@/lib/names";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { nanoid } from "@dub/utils";
import { EventType } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { queueGoogleAdsConversionUpload } from "../google-ads/upload-conversion";
import { ShopifyError } from "./error";
import { ShopifyOrder } from "./schema";

export async function createShopifyLead({
  order,
  clickId,
  workspaceId,
}: {
  order: ShopifyOrder;
  clickId: string;
  workspaceId: string;
}) {
  const { customer: orderCustomer } = order;

  const customerId = createId({ prefix: "cus_" });
  /*
     if orderCustomer is undefined (guest checkout):
    - use the customerId as the externalId
    - generate random name + email
  */
  const externalId = orderCustomer?.id?.toString() || customerId; // need to convert to string because Shopify customer ID is a number
  const name = orderCustomer
    ? `${orderCustomer.first_name} ${orderCustomer.last_name}`.trim()
    : generateRandomName();
  const email = orderCustomer?.email;

  // find click
  const clickData = await getClickEvent({ clickId });

  if (!clickData) {
    throw new ShopifyError("Click event not found. Skipping the order...");
  }

  const { link_id: linkId, country, timestamp } = clickData;

  const partnerLink = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
      disabledAt: true,
    },
  });

  if (!partnerLink) {
    throw new ShopifyError(
      "Link not found in your workspace. Skipping the order...",
    );
  }

  if (partnerLink.disabledAt) {
    throw new ShopifyError("Link is disabled. Skipping the order...");
  }

  // create customer
  const customer = await prisma.customer.create({
    data: {
      id: customerId,
      externalId,
      name,
      email,
      projectId: workspaceId,
      programId: partnerLink.programId,
      partnerId: partnerLink.partnerId,
      clickedAt: new Date(timestamp + "Z"),
      clickId,
      linkId,
      country,
    },
  });

  const leadEvent = {
    id: nanoid(16),
    name: "Account created",
  };

  const leadData = leadEventSchemaTB.parse({
    ...clickData,
    workspace_id: clickData.workspace_id || customer.projectId, // in case for some reason the click event doesn't have workspace_id
    event_id: leadEvent.id,
    event_name: leadEvent.name,
    customer_id: customer.id,
  });

  const [_lead, link, workspace] = await Promise.all([
    // record lead
    recordLead(leadData),

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
        id: workspaceId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),
  ]);

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "lead.created",
        workspace,
        data: transformLeadEventData({
          ...clickData,
          eventName: leadEvent.name,
          link,
          customer,
          metadata: null,
        }),
      }),

      queueGoogleAdsConversionUpload({
        workspaceId: workspace.id,
        eventType: EventType.lead,
        eventId: leadData.event_id,
        eventName: leadData.event_name,
        conversionDateTime: new Date().toISOString(),
        conversionCount: 1,
        click: {
          id: clickData.click_id,
          url: clickData.url,
        },
      }),

      ...(link.partnerId
        ? [
            sendPartnerPostback({
              partnerId: link.partnerId,
              event: "lead.created",
              data: {
                ...clickData,
                eventName: leadEvent.name,
                link,
                customer,
              },
            }),
          ]
        : []),

      ...(link.programId && link.partnerId
        ? [
            syncPartnerLinksStats({
              partnerId: link.partnerId,
              programId: link.programId,
              eventType: "lead",
            }),
            prisma.customer.update({
              where: {
                id: customer.id,
              },
              data: {
                programId: link.programId,
                partnerId: link.partnerId,
              },
            }),
          ]
        : []),
    ]),
  );

  return {
    leadData,
  };
}
