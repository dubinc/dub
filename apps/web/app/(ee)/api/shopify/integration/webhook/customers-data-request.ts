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
    customer: { id: customerExternalId },
    shop_domain: shopDomain,
    orders_requested: ordersRequested,
  } = schema.parse(event);

  const [{ user }, customer] = await Promise.all([
    prisma.projectUsers.findFirstOrThrow({
      where: {
        projectId: workspaceId,
        role: "owner",
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspaceId,
          externalId: customerExternalId.toString(),
        },
      },
    }),
  ]);

  const rows = [
    {
      text: "Shop domain",
      value: shopDomain,
    },
    {
      text: "Customer ID",
      value: customerExternalId.toString(),
    },
    {
      text: "Customer name",
      value: customer?.name ?? "N/A",
    },
    {
      text: "Customer email",
      value: customer?.email ?? "N/A",
    },
    ...(ordersRequested.length > 0
      ? [{ text: "Orders requested", value: ordersRequested.join(", ") }]
      : []),
  ];

  waitUntil(
    createPlainThread({
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
      },
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
