import z from "@/lib/zod";

export const clickEventSchema = z.object({
  timestamp: z.string(),
  click_id: z.string(),
  link_id: z.string(),
  url: z.string(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  device: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  referer: z.string().nullable(),
});

export const conversionRequestSchema = z.object({
  clickId: z.string({ required_error: "clickId is required" }),
  eventName: z
    .string({ required_error: "eventName is required" })
    .min(1)
    .max(50),
  eventType: z
    .union([z.literal("lead"), z.literal("sale")], {
      errorMap: () => ({
        message: "Must be either 'lead' or 'sale'",
      }),
    })
    .default("lead"),
  metadata: z.record(z.unknown()).nullish(),
  customerId: z.string().max(100).nullish(),
});

export const conversionEventSchema = clickEventSchema.merge(
  conversionRequestSchema.pick({
    eventName: true,
    eventType: true,
    metadata: true,
    customerId: true,
  }),
);

export type ConversionEvent = z.infer<typeof conversionEventSchema>;
