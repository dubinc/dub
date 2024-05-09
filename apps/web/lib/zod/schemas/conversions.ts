import z from "@/lib/zod";

export const eventType = z
  .enum(["lead", "sale"], {
    errorMap: () => ({
      message: "Must be either 'lead' or 'sale'",
    }),
  })
  .default("lead");

export const clickEventSchemaTB = z.object({
  timestamp: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  url: z.string(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  device: z.string().nullable(),
  device_model: z.string().nullable(),
  device_vendor: z.string().nullable(),
  browser: z.string().nullable(),
  browser_version: z.string().nullable(),
  os: z.string().nullable(),
  os_version: z.string().nullable(),
  engine: z.string().nullable(),
  engine_version: z.string().nullable(),
  cpu_architecture: z.string().nullable(),
  ua: z.string().nullable(),
  bot: z.number().nullable(),
  referer: z.string().nullable(),
  referer_url: z.string().nullable(),
});

export const leadEventSchemaTB = clickEventSchemaTB.omit({ url: true }).and(
  z.object({
    event_id: z.string(),
    event_name: z.string(),
    metadata: z.string(), // TODO: Fix the type
    customer_id: z.string(),
  }),
);

export const saleEventSchemaTB = clickEventSchemaTB.omit({ url: true }).and(
  z.object({
    event_id: z.string(),
    metadata: z.string(), // TODO: Fix the type
    customer_id: z.string(),
  }),
);

export const conversionRequestSchema = z.object({
  clickId: z.string({ required_error: "clickId is required" }),
  eventName: z
    .string({ required_error: "eventName is required" })
    .min(1)
    .max(50),
  eventType,
  metadata: z
    .record(z.unknown())
    .nullish()
    .transform((val) => (val ? JSON.stringify(val) : "")),
  customerId: z
    .string()
    .max(100)
    .default("")
    .describe(
      "This is the identifier for the customer in the client's app. This is used to track the customer's journey.",
    ),
});
