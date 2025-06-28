import { paypalEnv } from "@/lib/paypal/env";
import { redis } from "@/lib/upstash/redis";
import { waitUntil } from "@vercel/functions";
import crc32 from "buffer-crc32";
import crypto from "crypto";

const CERT_CACHE_KEY = "paypal:cert";

async function downloadAndCache(url: string) {
  const cachedCertPem = await redis.get<string>(CERT_CACHE_KEY);

  if (cachedCertPem) {
    return cachedCertPem;
  }

  const response = await fetch(url);
  const certPem = await response.text();

  waitUntil(redis.set(CERT_CACHE_KEY, certPem));

  return certPem;
}

export async function verifySignature({
  event,
  headers,
}: {
  event: string; // raw event data as string
  headers: Headers;
}) {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const timeStamp = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");

  if (!transmissionId || !transmissionSig || !timeStamp || !certUrl) {
    console.error(
      "[PayPal] Missing required headers for signature verification",
    );
    return false;
  }

  const certPem = await downloadAndCache(certUrl);

  if (!certPem) {
    console.error("[PayPal] Failed to download or cache PayPal certificate");
    return false;
  }

  const crc = parseInt("0x" + crc32(event).toString("hex"));
  const message = `${transmissionId}|${timeStamp}|${paypalEnv.PAYPAL_WEBHOOK_ID}|${crc}`;
  const signatureBuffer = Buffer.from(transmissionSig, "base64");

  const verifier = crypto.createVerify("SHA256");
  verifier.update(message);

  return verifier.verify(certPem, new Uint8Array(signatureBuffer));
}
