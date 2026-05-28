import { isProduction } from "@/lib/api/environment";

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

export const TREMENDOUS_WEBHOOK_IPS = isProduction
  ? TREMENDOUS_WEBHOOK_IPS_PRODUCTION
  : TREMENDOUS_WEBHOOK_IPS_SANDBOX;

export const TREMENDOUS_WEBHOOK_RELEVANT_EVENTS = new Set([
  "REWARDS.DELIVERY.SUCCEEDED",
  "REWARDS.DELIVERY.FAILED",
  "REWARDS.CANCELED",
  "ORDERS.CANCELED",
]);
