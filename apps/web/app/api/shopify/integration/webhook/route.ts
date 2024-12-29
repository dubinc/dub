import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { orderPaid } from "./order-paid";
import { verifyShopifySignature } from "./utils";

const relevantTopics = new Set(["orders/paid"]);

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const body = await req.json();

  // Find the topic from the headers
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";
  const signature = headers.get("x-shopify-hmac-sha256") || "";

  await verifyShopifySignature({ body, signature });

  if (!relevantTopics.has(topic)) {
    return new Response("Unsupported topic, skipping...", {
      status: 200,
    });
  }

  try {
    switch (topic) {
      case "orders/paid":
        await orderPaid(body);
        break;
    }
  } catch (error) {
    await log({
      message: `Shopify webhook failed. Error: ${error.message}`,
      type: "errors",
    });

    return new Response('Webhook error: "Webhook handler failed. View logs."', {
      status: 400,
    });
  }

  return NextResponse.json("OK");
};
