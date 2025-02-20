import { generateRandomName } from "@/lib/names";
import { createPlainThread } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
  orders_to_redact: z.array(z.number()),
  customer: z.object({
    id: z.number(),
  }),
});

export async function customersRedact({
  event,
  workspaceId,
}: {
  event: any;
  workspaceId: string;
}) {
  const {
    customer,
    shop_domain: shopDomain,
    orders_to_redact: ordersToRedact,
  } = schema.parse(event);

  const customerExternalId = customer.id.toString();

  // Redact the customer's data
  try {
    await prisma.customer.update({
      where: {
        projectId_externalId: {
          projectId: workspaceId,
          externalId: customerExternalId,
        },
      },
      data: {
        name: generateRandomName(),
        email: null,
      },
    });
  } catch (error) {
    return `[Shopify] Failed to redact customer data. Reason: ${error.message}`;
  }

  const { user } = await prisma.projectUsers.findFirstOrThrow({
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
  });

  const rows = [
    { text: "Shop domain", value: shopDomain },
    { text: "Customer ID", value: customerExternalId },
    ...(ordersToRedact.length > 0
      ? [{ text: "Orders to redact", value: ordersToRedact.join(", ") }]
      : []),
  ];

  waitUntil(
    createPlainThread({
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
      },
      title: `Shopify - Customer Redacted request received for ${shopDomain}`,
      components: rows.map((row) => ({
        componentRow: {
          rowMainContent: [{ componentText: { text: row.text } }],
          rowAsideContent: [{ componentText: { text: row.value } }],
        },
      })),
    }),
  );

  return "[Shopify] Customer Redacted request received.";
}
