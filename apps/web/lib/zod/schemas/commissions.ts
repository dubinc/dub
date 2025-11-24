import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { CommissionStatus, CommissionType } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema, WebhookPartnerSchema } from "./partners";
import { parseDateSchema } from "./utils";

export const CommissionSchema = z.object({
  id: z.string().describe("The commission's unique ID on Dub.").openapi({
    example: "cm_1JVR7XRCSR0EDBAF39FZ4PMYE",
  }),
  type: z.nativeEnum(CommissionType).optional(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(CommissionStatus),
  invoiceId: z.string().nullable(),
  description: z.string().nullable(),
  quantity: z.number(),
  userId: z
    .string()
    .nullish()
    .describe("The user who created the manual commission."),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Represents the commission object used in webhook and API responses (/api/commissions/**)
export const CommissionEnrichedSchema = CommissionSchema.merge(
  z.object({
    partner: EnrolledPartnerSchema.pick({
      id: true,
      name: true,
      email: true,
      image: true,
      payoutsEnabledAt: true,
      country: true,
      groupId: true,
    }),
    customer: CustomerSchema.nullish(), // customer can be null for click-based / custom commissions
  }),
);

// "commission.created" webhook event schema
export const CommissionWebhookSchema = CommissionSchema.merge(
  z.object({
    partner: WebhookPartnerSchema,
    customer: CustomerSchema.nullish(), // customer can be null for click-based / custom commissions
  }),
);

export const COMMISSIONS_MAX_PAGE_SIZE = 100;

export const getCommissionsQuerySchema = z
  .object({
    type: z.nativeEnum(CommissionType).optional(),
    customerId: z
      .string()
      .optional()
      .describe("Filter the list of commissions by the associated customer."),
    payoutId: z
      .string()
      .optional()
      .describe("Filter the list of commissions by the associated payout."),
    partnerId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated partner. When specified, takes precedence over `tenantId`.",
      ),
    tenantId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated partner's `tenantId` (their unique ID within your database).",
      ),
    groupId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated partner group.",
      ),
    invoiceId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated invoice. Since invoiceId is unique on a per-program basis, this will only return one commission per invoice.",
      ),
    status: z
      .nativeEnum(CommissionStatus)
      .optional()
      .describe(
        "Filter the list of commissions by their corresponding status.",
      ),
    sortBy: z
      .enum(["createdAt", "amount"])
      .default("createdAt")
      .describe("The field to sort the list of commissions by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("The sort order for the list of commissions."),
    interval: z
      .enum(DATE_RANGE_INTERVAL_PRESETS)
      .default("all")
      .describe("The interval to retrieve commissions for."),
    start: parseDateSchema
      .optional()
      .describe(
        "The start date of the date range to filter the commissions by.",
      ),
    end: parseDateSchema
      .optional()
      .describe("The end date of the date range to filter the commissions by."),
    timezone: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: COMMISSIONS_MAX_PAGE_SIZE }));

export const getCommissionsCountQuerySchema = getCommissionsQuerySchema.omit({
  page: true,
  pageSize: true,
  sortOrder: true,
  sortBy: true,
});

export const createCommissionSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  useExistingEvents: z.boolean(),

  // Custom
  date: parseDateSchema.nullish(),
  amount: z.number().min(0).nullish(),
  description: z.string().max(190).nullish(),

  // Lead
  customerId: z.string().nullish(),
  linkId: z.string().nullish(),
  leadEventDate: parseDateSchema.nullish(),
  leadEventName: z.string().nullish(),

  // Sale
  saleEventDate: parseDateSchema.nullish(),
  saleAmount: z.number().min(0).nullish(),
  invoiceId: z.string().nullish(),
  productId: z.string().nullish(),
});

export const updateCommissionSchema = z.object({
  amount: z
    .number()
    .min(0)
    .describe(
      "The new absolute amount for the sale. Paid commissions cannot be updated.",
    )
    .optional(),
  modifyAmount: z
    .number()
    .describe(
      "Modify the current sale amount: use positive values to increase the amount, negative values to decrease it. Takes precedence over `amount`. Paid commissions cannot be updated.",
    )
    .optional(),
  currency: z
    .string()
    .default("usd")
    .transform((val) => val.toLowerCase())
    .describe(
      "The currency of the sale amount to update. Accepts ISO 4217 currency codes.",
    ),
  status: z
    .enum(["refunded", "duplicate", "canceled", "fraud"])
    .optional()
    .describe(
      "Useful for marking a commission as refunded, duplicate, canceled, or fraudulent. Takes precedence over `amount` and `modifyAmount`. When a commission is marked as refunded, duplicate, canceled, or fraudulent, it will be omitted from the payout, and the payout amount will be recalculated accordingly. Paid commissions cannot be updated.",
    ),
});

export const CLAWBACK_REASONS = [
  {
    value: "order_canceled",
    label: "Order Canceled",
    description: "Order was canceled or refunded.",
  },
  {
    value: "fraud",
    label: "Fraud",
    description: "Fraudulent or invalid transaction.",
  },
  {
    value: "terms_violation",
    label: "Terms Violation",
    description: "Partner broke program rules.",
  },
  {
    value: "tracking_error",
    label: "Tracking Error",
    description: "Commission was assigned by mistake.",
  },
  {
    value: "payment_failed",
    label: "Payment Failed",
    description: "Customer payment failed or was reversed.",
  },
  {
    value: "ineligible_partner",
    label: "Ineligible Partner",
    description: "Partner was not eligible for this reward.",
  },
  {
    value: "duplicate_commission",
    label: "Duplicate Commission",
    description: "Commission was a duplicate entry.",
  },
  {
    value: "other",
    label: "Other",
    description: "Other issue not listed.",
  },
];

export const CLAWBACK_REASONS_MAP = Object.fromEntries(
  CLAWBACK_REASONS.map((r) => [r.value, r]),
);

export const createClawbackSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  amount: z.number().gt(0, "Amount must be greater than 0."),
  description: z.enum(
    CLAWBACK_REASONS.map((r) => r.value) as [string, ...string[]],
  ),
});

export const COMMISSION_EXPORT_COLUMNS = [
  { id: "id", label: "ID", type: "string", default: true },
  { id: "type", label: "Type", type: "string", default: true },
  { id: "amount", label: "Amount", type: "number", default: true },
  { id: "earnings", label: "Earnings", type: "number", default: true },
  { id: "currency", label: "Currency", type: "string", default: true },
  { id: "status", label: "Status", type: "string", default: true },
  { id: "invoiceId", label: "Invoice ID", type: "string", default: true },
  { id: "quantity", label: "Quantity", type: "number", default: true },
  { id: "createdAt", label: "Created at", type: "date", default: true },
  { id: "updatedAt", label: "Updated at", type: "date", default: false },
  { id: "partnerId", label: "Partner ID", type: "string", default: false },
  { id: "partnerName", label: "Partner name", type: "string", default: false },
  {
    id: "partnerEmail",
    label: "Partner email",
    type: "string",
    default: false,
  },
  {
    id: "partnerTenantId",
    label: "Partner tenant ID",
    type: "string",
    default: false,
  },
  { id: "customerId", label: "Customer ID", type: "string", default: false },
  {
    id: "customerName",
    label: "Customer name",
    type: "string",
    default: false,
  },
  {
    id: "customerEmail",
    label: "Customer email",
    type: "string",
    default: false,
  },
  {
    id: "customerExternalId",
    label: "Customer external ID",
    type: "string",
    default: false,
  },
] as const;

type CommissionExportColumnId =
  (typeof COMMISSION_EXPORT_COLUMNS)[number]["id"];

export const DEFAULT_COMMISSION_EXPORT_COLUMNS =
  COMMISSION_EXPORT_COLUMNS.filter((column) => column.default).map(
    (column) => column.id,
  );

export const commissionsExportQuerySchema = getCommissionsQuerySchema
  .omit({ page: true, pageSize: true })
  .merge(
    z.object({
      columns: z
        .string()
        .default(DEFAULT_COMMISSION_EXPORT_COLUMNS.join(","))
        .transform((v) => v.split(","))
        .refine(
          (columns): columns is CommissionExportColumnId[] => {
            const validColumnIds = COMMISSION_EXPORT_COLUMNS.map(
              (col) => col.id,
            );

            return columns.every((column): column is CommissionExportColumnId =>
              validColumnIds.includes(column as CommissionExportColumnId),
            );
          },
          {
            message:
              "Invalid column IDs provided. Please check the available columns.",
          },
        ),
    }),
  );
