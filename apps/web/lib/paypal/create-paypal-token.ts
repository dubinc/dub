import { paypalEnv } from "@/lib/paypal/env";
import { redis } from "@/lib/upstash/redis";
import { waitUntil } from "@vercel/functions";

interface PaypalTokenResponse {
  access_token: string;
  expires_in: number; // in seconds
}

const TOKEN_CACHE_KEY = "paypal:token";

/**
 * Creates and caches a PayPal access token for batch payouts authentication.
 * First checks Redis cache for an existing valid token, and if not found,
 * requests a new token from PayPal's OAuth2 endpoint.
 * The token is cached in Redis with a 5-minute buffer before expiration.
 */
export async function createPaypalToken() {
  const cachedToken = await redis.get(TOKEN_CACHE_KEY);

  if (cachedToken) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(
    `${paypalEnv.PAYPAL_CLIENT_ID}:${paypalEnv.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(paypalEnv.PAYPAL_API_HOST + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[PayPal] Failed to create PayPal token.", data);
    throw new Error("Failed to create PayPal token.");
  }

  const token = data as PaypalTokenResponse;

  waitUntil(
    redis.set(TOKEN_CACHE_KEY, token.access_token, {
      ex: token.expires_in - 60 * 5, // 5 min buffer
    }),
  );

  return token.access_token;
}
