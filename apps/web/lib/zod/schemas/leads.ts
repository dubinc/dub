import z from "@/lib/zod";
import { clickEventSchema, clickEventSchemaTB } from "./clicks";
import { CustomerSchema } from "./customers";
import { commonDeprecatedEventFields } from "./deprecated";
import { linkEventSchema, LinkSchema } from "./links";

export const trackLeadRequestSchema = z.object({
  clickId: z
    .string({ required_error: "clickId is required" })
    .trim()
    .min(1, "clickId is required")
    .describe(
      "The ID of the click in th Dub. You can read this value from `dub_id` cookie.",
    ),
  eventName: z
    .string({ required_error: "eventName is required" })
    .trim()
    .min(1, "eventName is required")
    .max(50)
    .describe("The name of the event to track.")
    .openapi({ example: "Sign up" }),
  externalId: z
    .string()
    .trim()
    .max(100)
    .default("") // Remove this after migrating users from customerId to externalId
    .describe(
      "This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.",
    ),
  customerId: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .default(null)
    .describe(
      "This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.",
    )
    .openapi({ deprecated: true }),
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

// response from tinybird endpoint
export const leadEventSchemaTBEndpoint = z.object({
  event: z.literal("lead"),
  timestamp: z.string(),
  event_id: z.string(),
  event_name: z.string(),
  customer_id: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  url: z.string(),
  continent: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  device: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  referer: z.string().nullable(),
  referer_url: z.string().nullable(),
  referer_url_processed: z.string().nullable(),
  qr: z.number().nullable(),
  ip: z.string().nullable(),
});

// response from dub api
export const leadEventResponseSchema = z
  .object({
    event: z.literal("lead"),
    timestamp: z.coerce.string(),
    eventId: z.string(),
    eventName: z.string(),
    // nested objects
    click: clickEventSchema,
    link: linkEventSchema,
    customer: CustomerSchema,
  })
  .merge(commonDeprecatedEventFields)
  .openapi({ ref: "LeadEvent" });

export const leadEventResponseObfuscatedSchema = leadEventResponseSchema
  .pick({
    click: true,
    timestamp: true,
    eventName: true,
  })
  .extend({
    link: LinkSchema.pick({
      url: true,
      shortLink: true,
      clicks: true,
      leads: true,
    }),
    customer: z.object({
      email: z
        .string()
        .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
      avatar: z.string().nullable(),
    }),
  });
