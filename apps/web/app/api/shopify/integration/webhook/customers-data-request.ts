import { createPlainThread } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
  orders_requested: z.array(z.number()),
  customer: z.object({
    id: z.number(),
  }),
});

export async function customersDataRequest({
  event,
  workspaceId,
}: {
  event: any;
  workspaceId: string;
}) {
  const {
    customer,
    shop_domain: shopDomain,
    orders_requested: ordersRequested,
  } = schema.parse(event);

  const customerExternalId = customer.id.toString();

  const { userId } = await prisma.projectUsers.findFirstOrThrow({
    where: {
      projectId: workspaceId,
      role: "owner",
    },
    select: {
      userId: true,
    },
  });

  const rows = [
    {
      text: "Shop domain",
      value: shopDomain,
    },
    {
      text: "Customer ID",
      value: customerExternalId,
    },
    ...(ordersRequested.length > 0
      ? [{ text: "Orders requested", value: ordersRequested.join(", ") }]
      : []),
  ];

  waitUntil(
    createPlainThread({
      userId,
      title: `Shopify - Customer data request received for ${shopDomain}`,
      components: rows.map((row) => ({
        componentRow: {
          rowMainContent: [{ componentText: { text: row.text } }],
          rowAsideContent: [{ componentText: { text: row.value } }],
        },
      })),
    }),
  );

  return "[Shopify] Customer Data Request received.";
}
