import { isLocalDev, isProduction } from "@/lib/api/environment";
import { getIP } from "@/lib/api/utils/get-ip";
import { tremendousEnv } from "@/lib/tremendous/configuration";
import crypto from "crypto";

// https://developers.tremendous.com/docs/webhooks-1#webhook-ips
const TREMENDOUS_WEBHOOK_IPS_PRODUCTION = [
  "34.150.143.187",
  "34.86.45.235",
  "35.188.236.188",
  "34.150.208.194",
] as const;

const TREMENDOUS_WEBHOOK_IPS_SANDBOX = [
  "35.194.78.88",
  "34.150.132.8",
  "34.145.182.28",
  "35.221.12.21",
] as const;

const TREMENDOUS_WEBHOOK_IPS = isProduction
  ? TREMENDOUS_WEBHOOK_IPS_PRODUCTION
  : TREMENDOUS_WEBHOOK_IPS_SANDBOX;

export async function verifySignature(req: Request) {
  const rawBody = await req.text();

  if (!isLocalDev) {
    const clientIp = await getIP();

    // @ts-ignore
    if (!TREMENDOUS_WEBHOOK_IPS.includes(clientIp)) {
      throw new Error(`Rejected webhook from IP ${clientIp}.`);
    }
  }

  const signatureHeader = req.headers.get("Tremendous-Webhook-Signature");

  if (!signatureHeader) {
    throw new Error("Webhook signature not found.");
  }

  const webhookSecret = tremendousEnv.TREMENDOUS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("TREMENDOUS_WEBHOOK_SECRET is not configured.");
  }

  const [algorithm, receivedSignature] = signatureHeader.split("=", 2);

  if (algorithm !== "sha256" || !receivedSignature) {
    throw new Error("Webhook signature format is invalid.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedSignatureBuffer = Uint8Array.from(
    Buffer.from(expectedSignature),
  );
  const receivedSignatureBuffer = Uint8Array.from(
    Buffer.from(receivedSignature),
  );

  const isSignatureValid =
    expectedSignatureBuffer.length === receivedSignatureBuffer.length &&
    crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer);

  if (!isSignatureValid) {
    throw new Error("Webhook signature is invalid.");
  }
}
