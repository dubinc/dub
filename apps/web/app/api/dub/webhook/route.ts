import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import crypto from "crypto";
import { leadCreated } from "./lead-created";
import { saleCreated } from "./sale-created";

// POST /api/dub/webhook - receive webhooks for Dub Referrals
export const POST = async (req: Request) => {
  const body = await req.json();
  const { event, data } = webhookPayloadSchema.parse(body);

  const webhookSignature = req.headers.get("Dub-Signature");

  if (!webhookSignature) {
    return new Response("No signature provided", { status: 401 });
  }

  const computedSignature = crypto
    .createHmac("sha256", `${process.env.DUB_WEBHOOK_SECRET}`)
    .update(JSON.stringify(body))
    .digest("hex");

  if (webhookSignature !== computedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  let response = "OK";

  switch (event) {
    case "lead.created": // new signup via referral link (lead event)
      response = await leadCreated(data);
      break;
    case "sale.created": // new sale via referral link (sale event)
      response = await saleCreated(data);
      break;
  }

  return new Response(response);
};
