import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { orderPaid } from "./order-paid";
import { verifyShopifySignature } from "./utils";

const relevantTopics = new Set(["orders/paid"]);

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const body = await req.json();
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";
  const signature = headers.get("x-shopify-hmac-sha256") || "";
  const shop = headers.get("x-shopify-shop-domain") || "";

  await verifyShopifySignature({ body, signature });

  if (!relevantTopics.has(topic)) {
    return new Response(`[Shopify] Unsupported topic: ${topic}. Skipping...`);
  }

  const workspace = await prisma.project.findUnique({
    where: {
      shopifyStoreId: shop,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return new Response(
      `[Shopify] Workspace not found for shop: ${shop}. Skipping...`,
    );
  }

  try {
    switch (topic) {
      case "orders/paid":
        await orderPaid({
          order: body,
          workspaceId: workspace.id,
        });
        break;
    }
  } catch (error) {
    await log({
      message: `Shopify webhook failed. Error: ${error.message}`,
      type: "errors",
    });

    return new Response(
      `[Shopify] Webhook error: "Webhook handler failed. View logs."`,
    );
  }

  return NextResponse.json("OK");
};
