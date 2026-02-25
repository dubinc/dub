import * as z from "zod/v4";
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
    programId: z.string().optional().describe("Program ID to filter by."),
    partnerId: z.string().optional().describe("Partner ID to filter by."),
    includeExpandedFields: booleanQuerySchema
      .optional()
      .describe(
        "Whether to include expanded fields on the customer (`link`, `partner`, `discount`).",
      ),
    sortBy: z
      .enum([
        "createdAt",
        "saleAmount",
        "firstSaleAt",
        "subscriptionCanceledAt",
      ])
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
  .extend(getPaginationQuerySchema({ pageSize: CUSTOMERS_MAX_PAGE_SIZE }));

export const getCustomersQuerySchemaExtended = getCustomersQuerySchema.extend({
  customerIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .nullish()
    .describe("Customer IDs to filter by."),
});

export const getCustomersCountQuerySchema = getCustomersQuerySchema
  .omit({
    includeExpandedFields: true,
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true,
  })
  .extend({ groupBy: z.enum(["country", "linkId", "partnerId"]).optional() });

export const createCustomerBodySchema = z.object({
  email: z.email().nullish().describe("The customer's email address."),
  name: z
    .string()
    .nullish()
    .describe(
      "The customer's name. If not provided, the email address will be used, and if email is not provided, a random name will be generated.",
    ),
  avatar: z
    .url()
    .nullish()
    .describe(
      "The customer's avatar URL. If not provided, a random avatar will be generated.",
    ),
  externalId: z
    .string("External ID is required")
    .describe(
      "The customer's unique identifier your database. This is useful for associating subsequent conversion events from Dub's API to your internal systems.",
    ),
  stripeCustomerId: z
    .string()
    .nullish()
    .describe(
      "The customer's Stripe customer ID. This is useful for attributing recurring sale events to the partner who referred the customer.",
    ),
  country: z
    .string()
    .describe(
      "The customer's country in ISO 3166-1 alpha-2 format. Updating this field will only affect the customer's country in Dub's system (and has no effect on existing conversion events).",
    ),
});

export const updateCustomerBodySchema = createCustomerBodySchema.partial();

// used in webhook responses + regular /customers endpoints (without expanded fields)
export const CustomerSchema = z.object({
  id: z
    .string()
    .describe(
      "The unique ID of the customer. You may use either the customer's `id` on Dub (obtained via `/customers` endpoint) or their `externalId` (unique ID within your system, prefixed with `ext_`, e.g. `ext_123`).",
    ),
  name: z.string().describe("Name of the customer."),
  email: z.string().nullish().describe("Email of the customer."),
  avatar: z.string().nullish().describe("Avatar URL of the customer."),
  externalId: z
    .string()
    .describe("Unique identifier for the customer in the client's app."),
  stripeCustomerId: z
    .string()
    .nullish()
    .describe(
      "The customer's Stripe customer ID. This is useful for attributing recurring sale events to the partner who referred the customer.",
    ),
  country: z.string().nullish().describe("Country of the customer."),
  sales: z
    .number()
    .nullish()
    .describe("Total number of sales for the customer."),
  saleAmount: z
    .number()
    .nullish()
    .describe("Total amount of sales for the customer."),
  createdAt: z
    .date()
    .describe(
      "The date the customer was created (usually the signup date or trial start date).",
    ),
  firstSaleAt: z
    .date()
    .nullish()
    .describe(
      "The date the customer made their first sale. Useful for calculating the time to first sale and LTV.",
    ),
  subscriptionCanceledAt: z
    .date()
    .nullish()
    .describe(
      "The date the customer canceled their subscription. Useful for calculating LTV and churn rate.",
    ),
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
  discount: DiscountSchema.omit({
    autoProvisionEnabledAt: true,
  }).nullish(),
});

export const StripeCustomerSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  country: z.string().nullable(),
  subscriptions: z.number(),
  dubCustomerId: z.string().nullable(),
});

export const StripeCustomerInvoiceSchema = z.object({
  id: z.string(),
  amount: z.number(),
  createdAt: z.date(),
  metadata: z.any(),
  dubCommissionId: z.string().nullish(),
});

export const CUSTOMER_EXPORT_COLUMNS = [
  {
    id: "id",
    label: "ID",
    type: "string",
    default: true,
    order: 1,
    programOnly: false,
  },
  {
    id: "name",
    label: "Name",
    type: "string",
    default: true,
    order: 2,
    programOnly: false,
  },
  {
    id: "email",
    label: "Email",
    type: "string",
    default: true,
    order: 3,
    programOnly: false,
  },
  {
    id: "avatar",
    label: "Avatar",
    type: "string",
    default: true,
    order: 4,
    programOnly: false,
  },
  {
    id: "externalId",
    label: "External ID",
    type: "string",
    default: true,
    order: 5,
    programOnly: false,
  },
  {
    id: "stripeCustomerId",
    label: "Stripe customer ID",
    type: "string",
    default: true,
    order: 6,
    programOnly: false,
  },
  {
    id: "country",
    label: "Country",
    type: "string",
    default: true,
    order: 7,
    programOnly: false,
  },
  {
    id: "sales",
    label: "Sales",
    type: "number",
    default: true,
    order: 8,
    programOnly: false,
  },
  {
    id: "saleAmount",
    label: "Sale amount",
    type: "number",
    default: true,
    order: 9,
    programOnly: false,
  },
  {
    id: "createdAt",
    label: "Created at",
    type: "date",
    default: true,
    order: 10,
    programOnly: false,
  },
  {
    id: "firstSaleAt",
    label: "First sale at",
    type: "date",
    default: true,
    order: 11,
    programOnly: false,
  },
  {
    id: "subscriptionCanceledAt",
    label: "Subscription canceled",
    type: "date",
    default: true,
    order: 12,
    programOnly: false,
  },
  {
    id: "link",
    label: "Link",
    type: "string",
    default: false,
    order: 13,
    programOnly: false,
  },
  {
    id: "partnerId",
    label: "Partner ID",
    type: "string",
    default: false,
    order: 14,
    programOnly: true,
  },
  {
    id: "partnerName",
    label: "Partner name",
    type: "string",
    default: false,
    order: 15,
    programOnly: true,
  },
  {
    id: "partnerEmail",
    label: "Partner email",
    type: "string",
    default: false,
    order: 16,
    programOnly: true,
  },
  {
    id: "partnerTenantId",
    label: "Partner tenant ID",
    type: "string",
    default: false,
    order: 17,
    programOnly: true,
  },
] as const;

type CustomerExportColumnId = (typeof CUSTOMER_EXPORT_COLUMNS)[number]["id"];

export const CUSTOMER_EXPORT_DEFAULT_COLUMNS = CUSTOMER_EXPORT_COLUMNS.filter(
  (column) => column.default,
).map((column) => column.id);

export const customersExportQuerySchema = getCustomersQuerySchema
  .omit({
    page: true,
    pageSize: true,
    includeExpandedFields: true,
  })
  .extend({
    columns: z
      .string()
      .optional()
      .default(CUSTOMER_EXPORT_DEFAULT_COLUMNS.join(","))
      .transform((v) => v.split(","))
      .refine(
        (columns) => {
          const validColumnIds = CUSTOMER_EXPORT_COLUMNS.map((col) => col.id);

          return columns.every((column: CustomerExportColumnId) =>
            validColumnIds.includes(column),
          );
        },
        {
          message:
            "Invalid column IDs provided. Please check the available columns.",
        },
      ),
  });

export const customersExportCronInputSchema = customersExportQuerySchema.extend(
  {
    workspaceId: z.string(),
    programId: z.string().optional(),
    userId: z.string(),
  },
);
