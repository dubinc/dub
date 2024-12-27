import { parseRequestBody } from "@/lib/api/utils";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { customerCreated } from "./customer-created";
import { orderPaid } from "./order-paid";

// TODO:
// Verify the webhook signature

const relevantTopics = new Set([
  "customers/create",
  "customers/update",
  "orders/paid",
]);

// POST /api/shopify/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const body = await parseRequestBody(req);

  // Find the topic from the headers
  const headers = req.headers;
  const topic = headers.get("x-shopify-topic") || "";

  if (!relevantTopics.has(topic)) {
    return new Response("Unsupported topic, skipping...", {
      status: 200,
    });
  }

  try {
    switch (topic) {
      case "customers/create":
        await customerCreated(body);
        break;
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
