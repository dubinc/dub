import { withAxiom } from "@/lib/axiom/server";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { timingSafeCompare } from "@/lib/webhook/timing-safe-compare";
import crypto from "crypto";
import { leadCreated } from "./lead-created";
import { saleCreated } from "./sale-created";

// POST /api/dub/webhook - receive webhooks for Dub
export const POST = withAxiom(async (req: Request) => {
  const webhookSignature = req.headers.get("Dub-Signature");

  if (!webhookSignature) {
    return new Response("No signature provided", { status: 401 });
  }

  // The sender signs JSON.stringify(payload), so the body is parsed before the signature check
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const computedSignature = crypto
    .createHmac("sha256", `${process.env.DUB_WEBHOOK_SECRET}`)
    .update(JSON.stringify(body))
    .digest("hex");

  if (!timingSafeCompare(webhookSignature, computedSignature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Validate the payload only after the signature check, so unsigned requests cannot reach the schema
  const parsed = webhookPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return new Response("Invalid webhook payload", { status: 400 });
  }

  const { event, data } = parsed.data;

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
});
