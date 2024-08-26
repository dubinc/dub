import { toCamelCase } from "@dub/utils";
import type { Webhook } from "@prisma/client";
import { LinkSchema } from "../zod/schemas/links";
import { clickSchema } from "./schemas";

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

export const transformLink = (data: any) => {
  // Note utm_* properties are converted to camelCase

  return LinkSchema.parse({
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  });
};

export const transformClick = (data: any) => {
  const click = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return clickSchema.parse({
    ...click,
    link: {
      id: click.linkId,
      url: click.url,
    },
  });
};

export const transformLead = (data: any) => {
  const lead = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return lead;
};

export const transformSale = (data: any) => {
  const sale = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toCamelCase(key), value]),
  );

  return sale;
};
