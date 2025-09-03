import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { orderSchema } from "./schema";

export async function createShopifyLead({
  clickId,
  workspaceId,
  event,
}: {
  clickId: string;
  workspaceId: string;
  event: any;
}) {
  const { customer: orderCustomer } = orderSchema.parse(event);

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
  const clickEvent = await getClickEvent({ clickId });

  const clickData = clickEvent.data[0];
  const { link_id: linkId, country, timestamp } = clickData;

  // create customer
  const customer = await prisma.customer.create({
    data: {
      id: customerId,
      externalId,
      name,
      email,
      projectId: workspaceId,
      clickedAt: new Date(timestamp + "Z"),
      clickId,
      linkId,
      country,
    },
  });

  const eventName = "Account created";

  const leadData = leadEventSchemaTB.parse({
    ...clickData,
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
  });

  const [_lead, link, workspace] = await Promise.all([
    // record lead
    recordLead(leadData),

    // update link leads count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        leads: {
          increment: 1,
        },
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
    sendWorkspaceWebhook({
      trigger: "lead.created",
      workspace,
      data: transformLeadEventData({
        ...clickData,
        eventName,
        link,
        customer,
      }),
    }),
  );

  return leadData;
}
