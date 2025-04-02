import z from "@/lib/zod";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";

export const getCustomersQuerySchema = z.object({
  email: z
    .string()
    .optional()
    .describe(
      "A case-sensitive filter on the list based on the customer's `email` field. The value must be a string.",
    ),
  externalId: z
    .string()
    .optional()
    .describe(
      "A case-sensitive filter on the list based on the customer's `externalId` field. The value must be a string.",
    ),
  includeExpandedFields: booleanQuerySchema
    .optional()
    .describe(
      "Whether to include expanded fields on the customer (`link`, `partner`, `discount`).",
    ),
});

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

export const CustomerSchema = z.object({
  id: z
    .string()
    .describe(
      "The unique ID of the customer. You may use either the customer's `id` on Dub (obtained via `/customers` endpoint) or their `externalId` (unique ID within your system, prefixed with `ext_`, e.g. `ext_123`).",
    ),
  externalId: z
    .string()
    .describe("Unique identifier for the customer in the client's app."),
  name: z.string().describe("Name of the customer."),
  email: z.string().nullish().describe("Email of the customer."),
  avatar: z.string().nullish().describe("Avatar URL of the customer."),
  country: z.string().nullish().describe("Country of the customer."),
  createdAt: z.date().describe("The date the customer was created."),
});

// An extended schema that includes the customer's link, partner, and discount.
export const CustomerEnrichedSchema = CustomerSchema.extend({
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
    programId: true,
  }).nullish(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }).nullish(),
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
