import z from "@/lib/zod";
import { clickEventSchema, clickEventSchemaTB } from "./clicks";
import { CustomerSchema } from "./customers";
import { commonDeprecatedEventFields } from "./deprecated";
import { linkEventSchema } from "./links";

export const trackLeadRequestSchema = z.object({
  clickId: z
    .string()
    .trim()
    .nullish()
    .describe(
      "The unique ID of the click that the lead conversion event is attributed to. You can read this value from `dub_id` cookie.",
    ),
  eventName: z
    .string()
    .trim()
    .min(1, "eventName is required")
    .max(255)
    .describe(
      "The name of the lead event to track. Can also be used as a unique identifier to associate a given lead event for a customer for a subsequent sale event (via the `leadEventName` prop in `/track/sale`).",
    )
    .openapi({ example: "Sign up" }),
  customerExternalId: z
    .string()
    .trim()
    .min(1, "customerExternalId is required")
    .max(100)
    .describe(
      "The unique ID of the customer in your system. Will be used to identify and attribute all future events to this customer.",
    ),
  customerName: z
    .string()
    .max(100)
    .nullish()
    .default(null)
    .describe(
      "The name of the customer. If not passed, a random name will be generated (e.g. “Big Red Caribou”).",
    ),
  customerEmail: z
    .string()
    .email()
    .max(100)
    .nullish()
    .default(null)
    .describe("The email address of the customer."),
  customerAvatar: z
    .string()
    .nullish()
    .default(null)
    .describe("The avatar URL of the customer."),
  eventQuantity: z
    .number()
    .nullish()
    .describe(
      "The numerical value associated with this lead event (e.g., number of provisioned seats in a free trial). If defined as N, the lead event will be tracked N times.",
    ),
  mode: z
    .enum(["async", "wait", "deferred"])
    .default("async")
    .describe(
      "The mode to use for tracking the lead event. `async` will not block the request; `wait` will block the request until the lead event is fully recorded in Dub; `deferred` will defer the lead event creation to a subsequent request.",
    ),
  metadata: z
    .record(z.unknown())
    .nullish()
    .default(null)
    .refine((val) => !val || JSON.stringify(val).length <= 10000, {
      message: "Metadata must be less than 10,000 characters when stringified",
    })
    .describe(
      "Additional metadata to be stored with the lead event. Max 10,000 characters.",
    ),
});

export const trackLeadResponseSchema = z.object({
  click: z.object({
    id: z.string(),
  }),
  customer: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    avatar: z.string().nullable(),
    externalId: z.string().nullable(),
  }),
});

export const leadEventSchemaTB = clickEventSchemaTB
  .omit({ timestamp: true }) // remove timestamp from lead data because tinybird will generate its own at ingestion time
  .merge(
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
  region: z.string().nullable(),
  region_processed: z.string().nullable(),
  device: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  trigger: z.string().nullish(), // backwards compatibility
  referer: z.string().nullable(),
  referer_url: z.string().nullable(),
  referer_url_processed: z.string().nullable(),
  qr: z.number().nullable(),
  ip: z.string().nullable(),
  metadata: z.string().nullish(),
});

// response from dub api
export const leadEventResponseSchema = z
  .object({
    event: z.literal("lead"),
    timestamp: z.coerce.string(),
    // core event fields
    eventId: z.string(),
    eventName: z.string(),
    metadata: z.any().nullish(),
    // nested objects
    click: clickEventSchema,
    link: linkEventSchema,
    customer: CustomerSchema,
  })
  .merge(commonDeprecatedEventFields)
  .openapi({ ref: "LeadEvent", title: "LeadEvent" });
