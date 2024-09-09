import z from "@/lib/zod";

export const commonDeprecatedEventFields = z.object({
  click_id: z
    .string()
    .describe("Deprecated. Use `click.id` instead.")
    .openapi({ deprecated: true }),
  link_id: z
    .string()
    .describe("Deprecated. Use `link.id` instead.")
    .openapi({ deprecated: true }),
  domain: z
    .string()
    .describe("Deprecated. Use `link.domain` instead.")
    .openapi({ deprecated: true }),
  key: z
    .string()
    .describe("Deprecated. Use `link.key` instead.")
    .openapi({ deprecated: true }),
  url: z
    .string()
    .describe("Deprecated. Use `click.url` instead.")
    .openapi({ deprecated: true }),
  continent: z
    .string()
    .describe("Deprecated. Use `click.continent` instead.")
    .openapi({ deprecated: true }),
  country: z
    .string()
    .describe("Deprecated. Use `click.country` instead.")
    .openapi({ deprecated: true }),
  city: z
    .string()
    .describe("Deprecated. Use `click.city` instead.")
    .openapi({ deprecated: true }),
  device: z
    .string()
    .describe("Deprecated. Use `click.device` instead.")
    .openapi({ deprecated: true }),
  browser: z
    .string()
    .describe("Deprecated. Use `click.browser` instead.")
    .openapi({ deprecated: true }),
  os: z
    .string()
    .describe("Deprecated. Use `click.os` instead.")
    .openapi({ deprecated: true }),
  qr: z
    .number()
    .describe("Deprecated. Use `click.qr` instead.")
    .openapi({ deprecated: true }),
  ip: z
    .string()
    .describe("Deprecated. Use `click.ip` instead.")
    .openapi({ deprecated: true }),
});
