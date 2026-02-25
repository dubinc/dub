import { getCustomersQuerySchema } from "@/lib/zod/schemas/customers";
import * as z from "zod/v4";

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
    label: "Subscription canceled at",
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
