import z from "zod";

export const commonDeprecatedEventFields = z.object({
  click_id: z
    .string()
    .describe("Deprecated: Use `click.id` instead.")
    .meta({ deprecated: true }),
  link_id: z
    .string()
    .describe("Deprecated: Use `link.id` instead.")
    .meta({ deprecated: true }),
  domain: z
    .string()
    .describe("Deprecated: Use `link.domain` instead.")
    .meta({ deprecated: true }),
  key: z
    .string()
    .describe("Deprecated: Use `link.key` instead.")
    .meta({ deprecated: true }),
  url: z
    .string()
    .describe("Deprecated: Use `click.url` instead.")
    .meta({ deprecated: true }),
  continent: z
    .string()
    .describe("Deprecated: Use `click.continent` instead.")
    .meta({ deprecated: true }),
  country: z
    .string()
    .describe("Deprecated: Use `click.country` instead.")
    .meta({ deprecated: true }),
  city: z
    .string()
    .describe("Deprecated: Use `click.city` instead.")
    .meta({ deprecated: true }),
  device: z
    .string()
    .describe("Deprecated: Use `click.device` instead.")
    .meta({ deprecated: true }),
  browser: z
    .string()
    .describe("Deprecated: Use `click.browser` instead.")
    .meta({ deprecated: true }),
  os: z
    .string()
    .describe("Deprecated: Use `click.os` instead.")
    .meta({ deprecated: true }),
  qr: z
    .number()
    .describe("Deprecated: Use `click.qr` instead.")
    .meta({ deprecated: true }),
  ip: z
    .string()
    .describe("Deprecated: Use `click.ip` instead.")
    .meta({ deprecated: true }),
});
