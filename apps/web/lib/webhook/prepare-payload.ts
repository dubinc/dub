import { nanoid } from "@dub/utils";
import { WebhookTrigger } from "../types";
import { webhookPayloadSchema } from "../zod/schemas/webhooks";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";

// Transform the payload to the format expected by the webhook
export const prepareWebhookPayload = (trigger: WebhookTrigger, data: any) => {
  const eventId = `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(16)}`;

  switch (trigger) {
    case "lead.created":
      data = transformLead(data);
      break;
    case "sale.created":
      data = transformSale(data);
      break;
    default:
      break;
  }

  const payload = webhookPayloadSchema.parse({
    id: eventId,
    data: data,
    event: trigger,
    createdAt: new Date().toISOString(),
  });

  console.info("Webhook payload", payload);

  return payload;
};

export const transformLead = (lead: any) => {
  const camelCaseLead = Object.fromEntries(
    Object.entries(lead).map(([key, value]) => [toCamelCase(key), value]),
  );

  // TODO:
  // Define zod schema to parse the data

  return camelCaseLead;
};

export const transformSale = (sale: any) => {
  const camelCaseSale = Object.fromEntries(
    Object.entries(sale).map(([key, value]) => [toCamelCase(key), value]),
  );

  // TODO:
  // Define zod schema to parse the data

  return camelCaseSale;
};

// From snake_case to camelCase
export const toCamelCase = (str: string) => {
  // If already camelCase, return as is
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
    return str;
  }

  // Convert snake_case to camelCase
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
