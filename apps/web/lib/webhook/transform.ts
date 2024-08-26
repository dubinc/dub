import { toCamelCase } from "@dub/utils";
import type { Webhook } from "@prisma/client";

interface TransformWebhookProps
  extends Pick<Webhook, "id" | "name" | "url" | "secret" | "triggers"> {
  links: { linkId: string }[];
}

// This is the format we send webhook details to the client
export const transformWebhook = (webhook: TransformWebhookProps) => {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret,
    triggers: webhook.triggers,
    linkIds: webhook.links.map(({ linkId }) => linkId),
  };
};

export const transformClick = (click: any) => {
  const camelCaseClick = Object.fromEntries(
    Object.entries(click).map(([key, value]) => [toCamelCase(key), value]),
  );

  return camelCaseClick;
};

export const transformLead = (lead: any) => {
  const camelCaseLead = Object.fromEntries(
    Object.entries(lead).map(([key, value]) => [toCamelCase(key), value]),
  );

  return camelCaseLead;
};

export const transformSale = (sale: any) => {
  const camelCaseSale = Object.fromEntries(
    Object.entries(sale).map(([key, value]) => [toCamelCase(key), value]),
  );

  return camelCaseSale;
};
