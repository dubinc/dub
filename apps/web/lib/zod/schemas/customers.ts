import z from "@/lib/zod";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";

export const CUSTOMERS_MAX_PAGE_SIZE = 100;

export const getCustomersQuerySchema = z
  .object({
    email: z
      .string()
      .optional()
      .describe(
        "A case-sensitive filter on the list based on the customer's `email` field. The value must be a string. Takes precedence over `externalId`.",
      ),
    externalId: z
      .string()
      .optional()
      .describe(
        "A case-sensitive filter on the list based on the customer's `externalId` field. The value must be a string. Takes precedence over `search`.",
      ),
    search: z
      .string()
      .optional()
      .describe(
        "A search query to filter customers by email, externalId, or name. If `email` or `externalId` is provided, this will be ignored.",
      ),
    country: z
      .string()
      .optional()
      .describe(
        "A filter on the list based on the customer's `country` field.",
      ),
    linkId: z
      .string()
      .optional()
      .describe(
        "A filter on the list based on the customer's `linkId` field (the referral link ID).",
      ),
    includeExpandedFields: booleanQuerySchema
      .optional()
      .describe(
        "Whether to include expanded fields on the customer (`link`, `partner`, `discount`).",
      ),

    sortBy: z
      .enum(["createdAt", "saleAmount"])
      .optional()
      .default("createdAt")
      .describe(
        "The field to sort the customers by. The default is `createdAt`.",
      ),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("desc")
      .describe("The sort order. The default is `desc`."),
  })
  .merge(getPaginationQuerySchema({ pageSize: CUSTOMERS_MAX_PAGE_SIZE }));

export const getCustomersQuerySchemaExtended = getCustomersQuerySchema.merge(
  z.object({
    customerIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .nullish()
      .describe("Customer IDs to filter by."),
  }),
);

export const getCustomersCountQuerySchema = getCustomersQuerySchema
  .omit({
    includeExpandedFields: true,
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({ groupBy: z.enum(["country", "linkId"]).optional() });

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
  sales: z
    .number()
    .nullish()
    .describe("Total number of sales for the customer."),
  saleAmount: z
    .number()
    .nullish()
    .describe("Total amount of sales for the customer."),
  createdAt: z.date().describe("The date the customer was created."),
});

// An extended schema that includes the customer's link, partner, and discount.
export const CustomerEnrichedSchema = CustomerSchema.extend({
  link: LinkSchema.pick({
    id: true,
    domain: true,
    key: true,
    shortLink: true,
    url: true,
    programId: true,
  }).nullish(),
  programId: z.string().nullish(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }).nullish(),
  discount: DiscountSchema.nullish(),
});
