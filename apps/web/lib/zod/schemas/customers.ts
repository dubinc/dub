import z from "@/lib/zod";
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

// simple schema returned by /events API
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string(),
  externalId: z.string().optional(),
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
