import crypto from "crypto";
import { NextRequest } from "next/server";

export async function verifyWebhookSignature(req: NextRequest) {
  const signature = req.headers["x-shopify-hmac-sha256"];

  const genSig = crypto
    .createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
    .update(JSON.stringify(req))
    .digest("base64");

  console.log({
    genSig,
    signature,
  });

  if (genSig !== signature) {
    throw new Error("Invalid webhook signature.");
  }

  return true;
}
