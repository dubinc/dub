import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { CommissionStatus, CommissionType } from "@prisma/client";
import * as z from "zod/v4";
import { createCustomerBodySchema, CustomerSchema } from "./customers";
import { LinkSchema } from "./links";
import {
  getCursorPaginationQuerySchema,
  getPaginationQuerySchema,
} from "./misc";
import { EnrolledPartnerSchema, WebhookPartnerSchema } from "./partners";
import { PayoutSchema } from "./payouts";
import { rewardContextSchema, RewardSchema } from "./rewards";
import { UserSchema } from "./users";
import { centsSchema, parseDateSchema } from "./utils";

export const CommissionSchema = z.object({
  id: z.string().describe("The commission's unique ID on Dub.").meta({
    example: "cm_1JVR7XRCSR0EDBAF39FZ4PMYE",
  }),
  type: z.enum(CommissionType).optional(), // Note: Not sure the type will ever be optional
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.enum(CommissionStatus),
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
export const CommissionEnrichedSchema = CommissionSchema.extend({
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
});

// Schema for the commission detail page (GET /api/commissions/:commissionId)
// TODO: Simplify this for OpenAPI and limit extra fields to in-app only – similar to getLinkInfoQuerySchemaExtended logic
export const CommissionDetailSchema = CommissionEnrichedSchema.extend({
  user: UserSchema.nullish().describe("The user who created the commission."),
  reward: RewardSchema.pick({
    event: true,
    description: true,
    type: true,
    amountInCents: true,
    amountInPercentage: true,
  }).nullish(),
  payout: PayoutSchema.pick({
    id: true,
    paidAt: true,
    initiatedAt: true,
  })
    .extend({
      user: UserSchema.nullish().describe("The user who processed the payout."),
    })
    .nullish(),
  holdingPeriodDays: z
    .number()
    .nullish()
    .describe("The holding period days for the partner group."),
});

// "commission.created" webhook event schema
export const CommissionWebhookSchema = CommissionSchema.extend({
  partner: WebhookPartnerSchema,
  customer: CustomerSchema.nullish(), // customer can be null for click-based / custom commissions
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    domain: true,
    key: true,
  }).nullable(),
});

export const COMMISSIONS_MAX_PAGE_SIZE = 100;

export const getCommissionsQuerySchema = z
  .object({
    type: z
      .enum(CommissionType)
      .optional()
      .describe(
        "Filter the list of commissions by type. " +
          "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
          "Examples: `sale`, `sale,lead`, `-click`.",
      ),
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
        "Filter the list of commissions by the associated partner. When specified, takes precedence over `tenantId`. " +
          "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
          "Examples: `partner_abc`, `partner_abc,partner_xyz`, `-partner_abc`.",
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
        "Filter the list of commissions by the associated partner group. " +
          "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
          "Examples: `group_abc`, `group_abc,group_xyz`, `-group_abc`.",
      ),
    partnerTagId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated partner tag. " +
          "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
          "Examples: `ptag_abc`, `ptag_abc,ptag_xyz`, `-ptag_abc`.",
      ),
    invoiceId: z
      .string()
      .optional()
      .describe(
        "Filter the list of commissions by the associated invoice. Since invoiceId is unique on a per-program basis, this will only return one commission per invoice.",
      ),
    status: z
      .enum(CommissionStatus)
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
  .extend({
    ...getCursorPaginationQuerySchema({
      example: "cm_1KAP4CGN2Z5TPYYQ1W4JEYD56",
    }),
    ...getPaginationQuerySchema({
      pageSize: COMMISSIONS_MAX_PAGE_SIZE,
      deprecated: true,
    }),
  });

export const getCommissionsCountQuerySchema = getCommissionsQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortOrder: true,
    sortBy: true,
    startingAfter: true,
    endingBefore: true,
  })
  .extend({
    // Accept raw string to support comma-separated multi-value (e.g. "sale,lead")
    type: z.string().optional(),
  });

export const commissionPatchStatusSchema = z.enum([
  "pending",
  "refunded",
  "duplicate",
  "canceled",
  "fraud",
]);

export const updateCommissionSchema = z.object({
  earnings: z
    .number()
    .min(0)
    .optional()
    .describe(
      "The new earnings amount for the commission. Paid commissions cannot be updated. If provided, will override the earnings calculated based on the sale amount and currency.",
    ),
  saleAmount: z
    .number()
    .min(0)
    .optional()
    .describe(
      "The new absolute amount for the sale. Paid commissions cannot be updated.",
    ),
  modifySaleAmount: z
    .number()
    .optional()
    .describe(
      "Modify the current sale amount: use positive values to increase the amount, negative values to decrease it. Takes precedence over `saleAmount`. Paid commissions cannot be updated.",
    ),
  currency: z
    .string()
    .optional()
    .default("usd")
    .transform((val) => val.toLowerCase())
    .describe(
      "The currency of the sale amount to update. Accepts ISO 4217 currency codes.",
    ),
  status: commissionPatchStatusSchema
    .optional()
    .describe(
      "Useful for marking a commission as pending, refunded, duplicate, canceled, or fraudulent. Takes precedence over `saleAmount` and `modifySaleAmount`. When a commission is marked as pending, refunded, duplicate, canceled, or fraudulent, it will be omitted from the payout, and the payout amount will be recalculated accordingly. Paid commissions cannot be updated.",
    ),
  amount: z
    .number()
    .min(0)
    .optional()
    .describe("Deprecated. Use `saleAmount` instead.")
    .meta({ deprecated: true }),
  modifyAmount: z
    .number()
    .optional()
    .describe("Deprecated. Use `modifySaleAmount` instead.")
    .meta({ deprecated: true }),
});

export const updateCommissionSchemaExtended = updateCommissionSchema.extend({
  updateHistoricalCommissions: z.boolean().optional(),
});

export const bulkUpdateCommissionsSchema = z.object({
  commissionIds: z
    .array(z.string())
    .min(1, "At least one commission ID is required.")
    .max(100, "You can only update up to 100 commissions at a time.")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "commissionIds must be unique.",
    }),
  status: commissionPatchStatusSchema.describe(
    "The status to apply to every commission in the batch.",
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
  { id: "amount", label: "Amount", type: "money", default: true },
  { id: "earnings", label: "Earnings", type: "money", default: true },
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
  {
    id: "stripeCustomerId",
    label: "Stripe customer ID",
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
  .omit({
    page: true,
    pageSize: true,
    startingAfter: true,
    endingBefore: true,
  })
  .extend({
    columns: z
      .string()
      .default(DEFAULT_COMMISSION_EXPORT_COLUMNS.join(","))
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .refine(
        (columns): columns is CommissionExportColumnId[] => {
          const validColumnIds = COMMISSION_EXPORT_COLUMNS.map((col) => col.id);

          return columns.every((column): column is CommissionExportColumnId =>
            validColumnIds.includes(column as CommissionExportColumnId),
          );
        },
        {
          message:
            "Invalid column IDs provided. Please check the available columns.",
        },
      ),
  });

export const createPartnerCommissionSchema = z.object({
  event: z.enum(CommissionType),
  partnerId: z.string(),
  programId: z.string(),
  linkId: z.string().optional(),
  customerId: z.string().optional(),
  eventId: z.string().optional(),
  invoiceId: z.string().nullish(),
  amount: z.number().default(0).optional(),
  quantity: z.number().default(1),
  currency: z.string().optional(),
  description: z.string().nullish(),
  createdAt: z.coerce.date().optional(),
  status: commissionPatchStatusSchema.optional(), // used for create-manual-commission (import commission as refunded)
  userId: z.string().optional(),
  context: rewardContextSchema.optional(),
  skipWorkflow: z.boolean().default(false).optional(),
  isFirstConversion: z.boolean().optional(),
  bountySubmissionId: z
    .string()
    .optional()
    .describe(
      "The ID of the bounty submission that the commission should be created for.",
    ),
  clickEvent: z
    .object({
      url: z.string().nullable(),
      referer: z.string().nullable(),
    })
    .optional(),
  triggerAggregateDueCommissions: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      "Whether to trigger the triggerAggregateDueCommissionsCronJob or not.",
    ),
});

export const createManualCommissionBodySchema = z
  .discriminatedUnion("type", [
    // Custom commission
    z.object({
      type: z.literal("custom"),
      partnerId: z
        .string()
        .describe("The ID of the partner to create the commission for."),
      amount: centsSchema
        .pipe(z.number().min(1))
        .describe("The commission amount in cents."),
      date: parseDateSchema
        .nullish()
        .describe("If not provided, the current date will be used."),
      description: z
        .string()
        .max(190)
        .nullish()
        .describe("The description of the commission."),
    }),

    // Lead commission
    z.object({
      type: z.literal("lead"),
      partnerId: z
        .string()
        .describe("The ID of the partner to create the commission for."),
      customerId: z
        .string()
        .nullish()
        .describe(
          "The customer ID to associate the commission with. Useful if the customer was already created in a prior operation and you want to associate the commission with it.",
        ),
      customer: createCustomerBodySchema
        .nullish()
        .describe(
          "The full customer object to associate the commission with. Useful for creating the customer on demand.",
        ),
      linkId: z
        .string()
        .nullish()
        .describe(
          "The partner link ID to associate the commission with. If not provided, default to the link with the most revenue.",
        ),
      leadEventDate: parseDateSchema
        .nullish()
        .describe(
          "The date and time of the lead event. If not provided, defaults to the current date and time.",
        ),
      leadEventName: z
        .string()
        .nullish()
        .default("Sign up")
        .describe(
          "The name of the lead event. If not provided, defaults to 'Sign up'.",
        ),
    }),

    // Sale commission
    z.object({
      type: z.literal("sale"),
      partnerId: z
        .string()
        .describe("The ID of the partner to create the commission for."),
      customerId: z
        .string()
        .nullish()
        .describe(
          "The customer ID to associate the commission with. Useful if the customer was already created in a prior operation and you want to associate the commission with it.",
        ),
      customer: createCustomerBodySchema
        .nullish()
        .describe(
          "The full customer object to associate the commission with. Useful for creating the customer on demand.",
        ),
      linkId: z
        .string()
        .nullish()
        .describe(
          "The partner link ID to associate the commission with. If not provided, default to the link with the most revenue.",
        ),
      importStripeInvoices: z
        .boolean()
        .nullish()
        .default(false)
        .describe(
          "When `true`, import all unimported paid Stripe invoices for the customer and create a commission for each. When `false`, create a single manual sale event using `saleAmount`.",
        ),
      saleAmount: centsSchema
        .pipe(z.number().min(0))
        .nullish()
        .describe(
          "Required when `importStripeInvoices` is `false`. The sale amount in cents for the manual sale event. Ignored when importing from Stripe.",
        ),
      saleEventDate: parseDateSchema
        .nullish()
        .describe(
          "Only used when `importStripeInvoices` is `false`. The date of the manual sale event. Defaults to the current date and time if not provided.",
        ),
      invoiceId: z
        .string()
        .nullish()
        .describe(
          "Only used when `importStripeInvoices` is `false`. An optional invoice ID to attach to the generated sale event and commission entry for deduplication.",
        ),
      productId: z
        .string()
        .nullish()
        .describe(
          "Only used when `importStripeInvoices` is `false`. An optional product ID stored on the sale event metadata – will also impact commission earnings calculation (if a `Sale` `Product ID` modifier is set).",
        ),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.type !== "sale") return;

    if (!data.importStripeInvoices && data.saleAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`saleAmount` is required when `importStripeInvoices` is false.",
        path: ["saleAmount"],
      });
    }
  });

export const createCommissionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
