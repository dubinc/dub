import { createPlainThread } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
});

export async function shopRedact({
  event,
  workspaceId,
}: {
  event: any;
  workspaceId: string;
}) {
  const { shop_domain: shopDomain } = schema.parse(event);

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

  const rows = [{ text: "Shop domain", value: shopDomain }];

  waitUntil(
    createPlainThread({
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
      },
      title: `Shopify - Shop Redacted request received for ${shopDomain}`,
      components: rows.map((row) => ({
        componentRow: {
          rowMainContent: [{ componentText: { text: row.text } }],
          rowAsideContent: [{ componentText: { text: row.value } }],
        },
      })),
    }),
  );

  return "[Shopify] Shop Redacted request received.";
}
