import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { customersDataRequest } from "./customers-data-request";
import { customersRedact } from "./customers-redact";
import { orderPaid } from "./order-paid";
import { shopRedact } from "./shop-redact";

const relevantTopics = new Set([
  "orders/paid",

  // Mandatory compliance webhooks
  "customers/data_request",
  "customers/redact",
  "shop/redact",
]);

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const body = await req.json();
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";
  const signature = headers.get("x-shopify-hmac-sha256") || "";
  const shopDomain = headers.get("x-shopify-shop-domain") || "";

  // Verify signature
  const generatedSignature = crypto
    .createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
    .update(JSON.stringify(body))
    .digest("base64");

  if (generatedSignature !== signature) {
    return new Response(`[Shopify] Invalid signature. Skipping...`, {
      status: 401,
    });
  }

  // Check if topic is relevant
  if (!relevantTopics.has(topic)) {
    return new Response(`[Shopify] Unsupported topic: ${topic}. Skipping...`);
  }

  // Find workspace
  const workspace = await prisma.project.findUnique({
    where: {
      shopifyStoreId: shopDomain,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return new Response(
      `[Shopify] Workspace not found for shop: ${shopDomain}. Skipping...`,
    );
  }

  try {
    switch (topic) {
      case "orders/paid":
        await orderPaid({
          body,
          workspaceId: workspace.id,
        });
        break;
      case "customers/data_request":
        await customersDataRequest({
          body,
        });
        break;
      case "customers/redact":
        await customersRedact({
          body,
        });
        break;
      case "shop/redact":
        await shopRedact({
          body,
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
