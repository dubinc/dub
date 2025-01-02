import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { appUninstalled } from "./app-uninstalled";
import { customersDataRequest } from "./customers-data-request";
import { customersRedact } from "./customers-redact";
import { orderPaid } from "./order-paid";
import { shopRedact } from "./shop-redact";

const relevantTopics = new Set([
  "orders/paid",

  // Mandatory compliance webhooks
  "app/uninstalled",
  "customers/data_request",
  "customers/redact",
  "shop/redact",
]);

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const data = await req.text();
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";
  const signature = headers.get("x-shopify-hmac-sha256") || "";

  // Verify signature
  const generatedSignature = crypto
    .createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
    .update(data, "utf8")
    .digest("base64");

  if (generatedSignature !== signature) {
    return new Response(`[Shopify] Invalid webhook signature. Skipping...`, {
      status: 401,
    });
  }

  // Check if topic is relevant
  if (!relevantTopics.has(topic)) {
    return new Response(`[Shopify] Unsupported topic: ${topic}. Skipping...`);
  }

  const event = JSON.parse(data);
  const shopDomain = headers.get("x-shopify-shop-domain") || "";

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
          event,
          workspaceId: workspace.id,
        });
        break;
      case "customers/data_request":
        await customersDataRequest({
          event,
        });
        break;
      case "customers/redact":
        await customersRedact({
          event,
        });
        break;
      case "shop/redact":
        await shopRedact({
          event,
        });
        break;
      case "app/uninstalled":
        await appUninstalled({
          shopDomain,
        });
        break;
    }
  } catch (error) {
    await log({
      message: `Shopify webhook failed. Error: ${error.message}`,
      type: "errors",
    });

    return new Response(
      `[Shopify] Webhook handler failed. View logs`,
    );
  }

  return NextResponse.json("OK");
};
