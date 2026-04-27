import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { isLocalDev } from "@/lib/api/environment";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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
      return new Response(`[Shopify] Invalid webhook signature. Skipping...`, {
        status: 401,
      });
    }
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
      defaultProgramId: true,
      webhookEnabled: true,
    },
  });

  if (!workspace) {
    return new Response(
      `[Shopify] Workspace not found for shop: ${shopDomain}. Skipping...`,
    );
  }

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
    await log({
      message: `Shopify webhook failed. Error: ${error.message}`,
      type: "errors",
    });

    const response = new Response(
      `[Shopify] Webhook handler failed. View logs`,
    );

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

  waitUntil(
    captureWebhookLog({
      ...requestLog,
      statusCode: 200,
      duration: Date.now() - startTime,
      responseBody: response,
    }),
  );

  return new Response(response);
};
