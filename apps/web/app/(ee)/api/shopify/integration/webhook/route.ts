import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { isLocalDev } from "@/lib/api/environment";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import crypto from "crypto";
import { appUninstalled } from "./app-uninstalled";
import { customersDataRequest } from "./customers-data-request";
import { customersRedact } from "./customers-redact";
import { ordersPaid } from "./orders-paid";
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
  const startTime = Date.now();
  const data = await req.text();
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";
  const signature = headers.get("x-shopify-hmac-sha256") || "";

  if (!isLocalDev) {
    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
      .update(data, "utf8")
      .digest("base64");

    if (generatedSignature !== signature) {
      console.log({
        generatedSignature,
        signature,
      });

      return logAndRespond(
        "Shopify webhook signature verification failed. Skipping...",
        {
          status: 401,
        },
      );
    }
  }

  // Check if topic is relevant
  if (!relevantTopics.has(topic)) {
    return logAndRespond(`Unsupported topic: ${topic}. Skipping...`);
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
      defaultProgramId: true,
      webhookEnabled: true,
    },
  });

  if (!workspace) {
    return logAndRespond(
      `Workspace not found for shop: ${shopDomain}. Skipping...`,
    );
  }

  console.info("Webhook event", {
    workspaceId: workspace.id,
    shopDomain,
    topic,
  });

  const requestLog = {
    workspaceId: workspace.id,
    method: req.method,
    path: "/shopify/integration/webhook" as const,
    requestBody: event,
    userAgent: req.headers.get("user-agent"),
  };

  let response = "OK";

  try {
    switch (topic) {
      case "orders/paid":
        response = await ordersPaid({
          event,
          workspace,
        });
        break;
      case "customers/data_request":
        response = await customersDataRequest({
          event,
          workspaceId: workspace.id,
        });
        break;
      case "customers/redact":
        response = await customersRedact({
          event,
          workspaceId: workspace.id,
        });
        break;
      case "shop/redact":
        response = await shopRedact({
          event,
          workspaceId: workspace.id,
        });
        break;
      case "app/uninstalled":
        response = await appUninstalled({
          shopDomain,
        });
        break;
    }
  } catch (error) {
    const response = new Response("Webhook handler failed. View logs.");

    waitUntil(
      captureWebhookLog({
        ...requestLog,
        statusCode: 500,
        duration: Date.now() - startTime,
        responseBody: response,
      }),
    );

    return response;
  }

  // orders/paid is logged by processShopifyOrderJob after the order is processed
  if (topic !== "orders/paid") {
    waitUntil(
      captureWebhookLog({
        ...requestLog,
        statusCode: 200,
        duration: Date.now() - startTime,
        responseBody: response,
      }),
    );
  }

  return new Response(response);
};
