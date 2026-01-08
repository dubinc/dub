import * as z from "zod/v4";

export const commonDeprecatedEventFields = z.object({
  click_id: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.id` instead.",
  }),
  link_id: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `link.id` instead.",
  }),
  domain: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `link.domain` instead.",
  }),
  key: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `link.key` instead.",
  }),
  url: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.url` instead.",
  }),
  continent: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.continent` instead.",
  }),
  country: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.country` instead.",
  }),
  city: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.city` instead.",
  }),
  device: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.device` instead.",
  }),
  browser: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.browser` instead.",
  }),
  os: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.os` instead.",
  }),
  qr: z.number().meta({
    deprecated: true,
    description: "Deprecated: Use `click.qr` instead.",
  }),
  ip: z.string().meta({
    deprecated: true,
    description: "Deprecated: Use `click.ip` instead.",
  }),
});
