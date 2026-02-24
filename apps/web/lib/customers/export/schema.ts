import { getCustomersQuerySchema } from "@/lib/zod/schemas/customers";
import * as z from "zod/v4";

export const CUSTOMER_EXPORT_COLUMNS = [
  { id: "id", label: "ID", type: "string", default: false },
  { id: "name", label: "Name", type: "string", default: true },
  { id: "email", label: "Email", type: "string", default: true },
  { id: "country", label: "Country", type: "string", default: true },
  { id: "partner", label: "Partner", type: "string", default: true },
  { id: "link", label: "Link", type: "string", default: true },
  { id: "sales", label: "Sales", type: "number", default: false },
  { id: "saleAmount", label: "Sale amount", type: "number", default: true },
  { id: "createdAt", label: "Created at", type: "date", default: true },
  { id: "firstSaleAt", label: "First sale at", type: "date", default: true },
  {
    id: "subscriptionCanceledAt",
    label: "Subscription canceled at",
    type: "date",
    default: true,
  },
  { id: "externalId", label: "External ID", type: "string", default: true },
  {
    id: "stripeCustomerId",
    label: "Stripe customer ID",
    type: "string",
    default: false,
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

export const customersExportCronPayloadSchema =
  customersExportQuerySchema.extend({
    programId: z.string(),
    userId: z.string(),
  });
