import z from "@/lib/zod";

export const commonDeprecatedEventFields = z.object({
  click_id: z.string(),
  link_id: z
    .string()
    .describe("Deprecated. Use `link.id` instead.")
    .openapi({ deprecated: true }),
  domain: z.string().describe("Deprecated. Use `link.domain` instead."),
  key: z.string().describe("Deprecated. Use `link.key` instead."),
  url: z.string().describe("Deprecated. Use `click.url` instead."),
  continent: z.string().describe("Deprecated. Use `click.continent` instead."),
  country: z.string().describe("Deprecated. Use `click.country` instead."),
  city: z.string().describe("Deprecated. Use `click.city` instead."),
  device: z.string().describe("Deprecated. Use `click.device` instead."),
  browser: z.string().describe("Deprecated. Use `click.browser` instead."),
  os: z.string().describe("Deprecated. Use `click.os` instead."),
  referer: z.string().describe("Deprecated. Use `click.referer` instead."),
  qr: z.number().describe("Deprecated. Use `click.qr` instead."),
  ip: z.string().describe("Deprecated. Use `click.ip` instead."),
});
