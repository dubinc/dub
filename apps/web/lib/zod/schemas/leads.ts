import z from "@/lib/zod";
import { clickEventSchema, clickEventSchemaTB } from "./clicks";
import { customerSchema } from "./customers";
import { linkEventSchema } from "./links";

export const trackLeadRequestSchema = z.object({
  // Required
  clickId: z
    .string({ required_error: "clickId is required" })
    .trim()
    .min(1, "clickId is required")
    .describe(
      "The ID of the click in th Dub. You can read this value from `dclid` cookie.",
    ),
  eventName: z
    .string({ required_error: "eventName is required" })
    .trim()
    .min(1, "eventName is required")
    .max(50)
    .describe("The name of the event to track.")
    .openapi({ example: "Sign up" }),
  customerId: z
    .string({ required_error: "customerId is required" })
    .trim()
    .min(1, "customerId is required")
    .max(100)
    .describe(
      "This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.",
    ),

  // Optional
  customerName: z
    .string()
    .max(100)
    .nullish()
    .default(null)
    .describe("Name of the customer in the client's app."),
  customerEmail: z
    .string()
    .email()
    .max(100)
    .nullish()
    .default(null)
    .describe("Email of the customer in the client's app."),
  customerAvatar: z
    .string()
    .max(100)
    .nullish()
    .default(null)
    .describe("Avatar of the customer in the client's app."),
  metadata: z
    .record(z.unknown())
    .nullish()
    .default(null)
    .describe("Additional metadata to be stored with the lead event"),
});

export const trackLeadResponseSchema = z.object({
  click: z.object({
    id: z.string(),
  }),
  customer: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    avatar: z.string().nullable(),
  }),
});

export const leadEventSchemaTB = clickEventSchemaTB
  .omit({ timestamp: true })
  .and(
    z.object({
      event_id: z.string(),
      event_name: z.string(),
      customer_id: z.string().default(""),
      metadata: z.string().default(""),
    }),
  );

export const leadEventEnrichedSchema = z.object({
  event: z.literal("lead"),
  timestamp: z.string(),
  event_id: z.string(),
  event_name: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_avatar: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  domain: z.string(),
  key: z.string(),
  url: z.string(),
  continent: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  device: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  referer: z.string().nullable(),
  qr: z.number().nullable(),
  ip: z.string().nullable(),
});

export const leadEventResponseSchema = z
  .object({
    event: z.literal("lead"),
    timestamp: z.coerce.string(),
    eventId: z.string(),
    eventName: z.string(),
    // deprecated fields
    event_id: z.string().describe("Deprecated. Use `eventId` instead."),
    event_name: z.string().describe("Deprecated. Use `eventName` instead."),
    link_id: z
      .string()
      .describe("Deprecated. Use `link.id` instead.")
      .openapi({ deprecated: true }),
    click_id: z
      .string()
      .describe("Deprecated. Use `click.id` instead.")
      .openapi({ deprecated: true }),
    customer_name: z
      .string()
      .describe("Deprecated. Use `customer.name` instead.")
      .openapi({ deprecated: true }),
    customer_email: z
      .string()
      .describe("Deprecated. Use `customer.email` instead.")
      .openapi({ deprecated: true }),
    customer_avatar: z
      .string()
      .describe("Deprecated. Use `customer.avatar` instead.")
      .openapi({ deprecated: true }),
    domain: z.string().describe("Deprecated. Use `link.domain` instead."),
    key: z.string().describe("Deprecated. Use `link.key` instead."),
    url: z.string().describe("Deprecated. Use `click.url` instead."),
    continent: z
      .string()
      .describe("Deprecated. Use `click.continent` instead."),
    country: z.string().describe("Deprecated. Use `click.country` instead."),
    city: z.string().describe("Deprecated. Use `click.city` instead."),
    device: z.string().describe("Deprecated. Use `click.device` instead."),
    browser: z.string().describe("Deprecated. Use `click.browser` instead."),
    os: z.string().describe("Deprecated. Use `click.os` instead."),
    referer: z.string().describe("Deprecated. Use `click.referer` instead."),
    qr: z.number().describe("Deprecated. Use `click.qr` instead."),
    ip: z.string().describe("Deprecated. Use `click.ip` instead."),
    // nested objects
    click: clickEventSchema,
    link: linkEventSchema,
    customer: customerSchema,
  })
  .openapi({ ref: "LeadEvent" });
