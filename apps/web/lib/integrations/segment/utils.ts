import { WebhookTrigger } from "@/lib/types";

export const createSegmentBasicAuthHeader = (writeKey: string) => {
  return `Basic ${Buffer.from(`${writeKey}:`).toString("base64")}`;
};

// supported workspace level events
export const supportedEvents: WebhookTrigger[] = [
  "lead.created",
  "sale.created",
];
