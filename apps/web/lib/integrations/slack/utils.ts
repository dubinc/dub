import { WebhookTrigger } from "@/lib/types";

export const supportedEvents: WebhookTrigger[] = [
  "link.created",
  "link.updated",
  "link.deleted",
  "lead.created",
  "sale.created",
];
