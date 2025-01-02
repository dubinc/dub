import z from "@/lib/zod";
import { DiscountSchema } from "./discount";
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
  country: z.string().nullish().describe("Country of the customer."),
  createdAt: z.date().describe("The date the customer was created."),
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
    programId: true,
  }).nullish(),
  partner: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullish(),
    })
    .nullish(),
  discount: DiscountSchema.nullish(),
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
