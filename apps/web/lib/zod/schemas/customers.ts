import z from "@/lib/zod";
import { LinkSchema } from "./links";
import { getPaginationQuerySchema } from "./misc";

export const createCustomerBodySchema = z.object({
  email: z
    .string()
    .email()
    .nullish()
    .describe("Email of the customer in the client's app."),
  name: z
    .string()
    .nullish()
    .describe(
      "Name of the customer in the client's app. If not provided, a random name will be generated.",
    ),
  avatar: z
    .string()
    .url()
    .nullish()
    .describe("Avatar URL of the customer in the client's app."),
  externalId: z
    .string()
    .describe("Unique identifier for the customer in the client's app."),
});

export const updateCustomerBodySchema = createCustomerBodySchema.partial();

// customer object schema
export const CustomerSchema = z.object({
  id: z.string().describe("The unique identifier of the customer in Dub."),
  externalId: z
    .string()
    .describe("Unique identifier for the customer in the client's app."),
  name: z.string().describe("Name of the customer."),
  email: z.string().nullish().describe("Email of the customer."),
  avatar: z.string().nullish().describe("Avatar URL of the customer."),
  createdAt: z.date().describe("The date the customer was created."),
  country: z.string().nullish().describe("Country of the customer."),
});

export const trackCustomerRequestSchema = z.object({
  // Required
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
    .optional()
    .describe("Name of the customer in the client's app."),
  customerEmail: z
    .string()
    .email()
    .max(100)
    .optional()
    .describe("Email of the customer in the client's app."),
  customerAvatar: z
    .string()
    .max(100)
    .optional()
    .describe("Avatar of the customer in the client's app."),
});

export const trackCustomerResponseSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerAvatar: z.string().nullable(),
});

export const CUSTOMERS_MAX_PAGE_SIZE = 100;

export const customersQuerySchema = z
  .object({
    search: z.string().optional(),
    ids: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("IDs of customers to filter by."),
  })
  .merge(getPaginationQuerySchema({ pageSize: CUSTOMERS_MAX_PAGE_SIZE }));

export const customerEventsSchemaTB = z.object({
  timestamp: z.string(),
  event: z.string(),
  event_name: z.string(),
  metadata: z.string().default(""),
});

export const customerActivitySchema = z.object({
  timestamp: z.date(),
  event: z.enum(["click", "lead", "sale"]),
  eventName: z.string(),
  eventDetails: z.string().nullish(),
  metadata: z.union([
    z.null(),
    z.object({
      paymentProcessor: z.string(),
      amount: z.number(),
    }),
  ]),
});

export const customerActivityResponseSchema = z.object({
  ltv: z.number(),
  timeToLead: z.number().nullable(),
  timeToSale: z.number().nullable(),
  activity: z.array(customerActivitySchema),
  customer: CustomerSchema.merge(
    z.object({
      country: z.string().nullish(),
    }),
  ),
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
  }).nullish(),
});
