import { createId } from "@/lib/api/utils";
import { generateRandomName } from "@/lib/names";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
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
  const {
    customer: { id: externalId, email, first_name, last_name },
  } = orderSchema.parse(event);

  // find click
  const clickEvent = await getClickEvent({ clickId });

  const clickData = clickEvent.data[0];
  const { link_id: linkId, country, timestamp } = clickData;

  // create customer
  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      // need to convert to string because Shopify customer ID is a number
      externalId: externalId.toString(),
      name: `${first_name} ${last_name}`.trim() || generateRandomName(),
      email: email || null,
      projectId: workspaceId,
      clickedAt: new Date(timestamp + "Z"),
      clickId,
      linkId,
      country,
    },
  });

  const leadData = leadEventSchemaTB.parse({
    ...clickData,
    event_id: nanoid(16),
    event_name: "Account created",
    customer_id: customer.id,
  });

  await Promise.all([
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

  return leadData;
}
