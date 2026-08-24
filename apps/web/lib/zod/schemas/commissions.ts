import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { CommissionStatus, CommissionType } from "@prisma/client";
import * as z from "zod/v4";
import { createCustomerBodySchema, CustomerSchema } from "./customers";
import { trackLeadRequestSchema } from "./leads";
import { LinkSchema } from "./links";
import {
  getCursorPaginationQuerySchema,
  getPaginationQuerySchema,
} from "./misc";
import { EnrolledPartnerSchema, WebhookPartnerSchema } from "./partners";
import { PayoutSchema } from "./payouts";
import { rewardContextSchema, RewardSchema } from "./rewards";
import { trackSaleRequestSchema } from "./sales";
import { UserSchema } from "./users";
import { centsSchema, parseDateSchema } from "./utils";

export const CommissionSchema = z.object({
  id: z.string().describe("The commission's unique ID on Dub.").meta({
    example: "cm_1JVR7XRCSR0EDBAF39FZ4PMYE",
  }),
  type: z
    .enum(CommissionType)
    .describe(
      "The type of commission. Can be `click`, `lead`, `sale`, `referral`, or `custom`.",
    ),
  amount: z
    .number()
    .describe(
      "The associated event amount in cents. For sale commissions, this is the sale amount.",
    ),
  earnings: z.number().describe("The amount earned by the partner, in cents."),
  currency: z
    .string()
    .describe("The currency of the commission, as an ISO 4217 currency code."),
  status: z
    .enum(CommissionStatus)
    .describe("The current status of the commission."),
  invoiceId: z
    .string()
    .nullable()
    .describe("The associated invoice ID. Only set for sale commissions."),
  description: z
    .string()
    .nullable()
    .describe("An optional description of the commission."),
  quantity: z
    .number()
    .describe(
      "The event quantity. Used for click and lead commissions; typically `1` for sale and custom commissions.",
    ),
  userId: z
    .string()
    .nullish()
    .describe("The user who created the manual commission."),
  metadata: z
    .record(z.string(), z.any())
    .nullable()
    .describe(
      "User-provided metadata from the associated lead or sale event (`lead.metadata` / `sale.metadata`).",
    ),
  createdAt: z
    .date()
    .describe("The date and time when the commission was created."),
  updatedAt: z
    .date()
    .describe("The date and time when the commission was last updated."),
});

// Represents the commission object used in webhook and API responses (/api/commissions/**)
export const CommissionEnrichedSchema = CommissionSchema.extend({
  paidAt: z
    .date()
    .nullable()
    .describe(
      "The date the commission was paid out to the partner. Null if not paid yet.",
    ),
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
    query: z
      .string()
      .max(10000)
      .optional()
      .meta({
        description:
          "Filter by lead or sale event metadata. Top-level keys only. Compares string values only — numeric and boolean metadata values are not matched.",
        examples: [
          "metadata['key']='value'",
          "metadata['key']!='value'",
          "metadata['key']='value' AND metadata['key2']='value2'",
          "metadata['key']='value' OR metadata['key2']='value2'",
        ],
      }),
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

export const COMMISSION_EXPORT_COLUMNS = [
  { id: "id", label: "ID", type: "string", default: true },
  { id: "type", label: "Type", type: "string", default: true },
  { id: "amount", label: "Amount", type: "money", default: true },
  { id: "earnings", label: "Earnings", type: "money", default: true },
  { id: "currency", label: "Currency", type: "string", default: true },
  { id: "status", label: "Status", type: "string", default: true },
  { id: "invoiceId", label: "Invoice ID", type: "string", default: true },
  { id: "description", label: "Description", type: "string", default: false },
  { id: "quantity", label: "Quantity", type: "number", default: true },
  { id: "createdAt", label: "Created at", type: "date", default: true },
  { id: "paidAt", label: "Paid at", type: "date", default: false },
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
  metadata: z.record(z.string(), z.any()).nullish(),
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

// Custom commission (negative amount = clawback)
const createCustomCommissionSchema = z.object({
  type: z.literal("custom"),
  partnerId: z
    .string()
    .describe("The ID of the partner to create the commission for."),
  amount: centsSchema
    .pipe(
      z.number().refine((n) => n !== 0, {
        message: "Amount cannot be 0.",
      }),
    )
    .describe(
      "The commission amount in cents. Use a negative amount to create a clawback.",
    ),
  date: parseDateSchema
    .nullish()
    .describe("If not provided, the current date will be used."),
  description: z
    .string()
    .max(190)
    .nullish()
    .describe(
      [
        "The description of the commission. Required for clawbacks (negative `amount`).",
        "May be a known clawback reason (`order_canceled`, `fraud`, `terms_violation`, `tracking_error`, `payment_failed`, `ineligible_partner`, `duplicate_commission`) or an arbitrary string (max 190 characters).",
      ].join(" "),
    ),
});

const createLeadCommissionSchema = z.object({
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
  date: parseDateSchema
    .nullish()
    .describe(
      "The date and time of the lead event. If not provided, defaults to the current date and time.",
    ),
  lead: z
    .object({
      eventName: trackLeadRequestSchema.shape.eventName
        .nullish()
        .describe(
          "The name of the lead event to track. If not provided, defaults to 'Sign up'.",
        ),
      metadata: trackLeadRequestSchema.shape.metadata,
    })
    .nullish()
    .describe("The lead event object to associate the commission with."),

  // Deprecated fields
  leadEventDate: parseDateSchema
    .nullish()
    .describe(
      "Deprecated: Use `date` instead. The date and time of the lead event. If not provided, defaults to the current date and time.",
    )
    .meta({ deprecated: true }),
  leadEventName: z
    .string()
    .nullish()
    .default("Sign up")
    .describe(
      "Deprecated: Use `lead.eventName` instead. The name of the lead event. If not provided, defaults to 'Sign up'.",
    )
    .meta({ deprecated: true }),
});

const createSaleCommissionSchema = z
  .object({
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
        "When `true`, import all unimported paid Stripe invoices for the customer and create a commission for each. When `false`, create a single manual sale event using `sale.amount` (or deprecated `saleAmount`).",
      ),
    date: parseDateSchema
      .nullish()
      .describe(
        "Only used when `importStripeInvoices` is `false`. The date of the manual sale event. Defaults to the current date and time if not provided.",
      ),
    sale: z
      .object({
        amount: centsSchema
          .pipe(z.number().int().min(0))
          .nullish()
          .describe(
            "The amount of the sale in cents (for all two-decimal currencies). If the sale is in a zero-decimal currency, pass the full integer value (e.g. `1580` JPY). Learn more: https://d.to/currency",
          ),
        currency: trackSaleRequestSchema.shape.currency,
        eventName: trackSaleRequestSchema.shape.eventName,
        paymentProcessor: trackSaleRequestSchema.shape.paymentProcessor,
        invoiceId: trackSaleRequestSchema.shape.invoiceId,
        metadata: trackSaleRequestSchema.shape.metadata,
      })
      .nullish()
      .describe("The sale event object to associate the commission with."),

    // Deprecated fields
    saleEventDate: parseDateSchema
      .nullish()
      .describe("Deprecated: Use `date` instead.")
      .meta({ deprecated: true }),
    saleAmount: centsSchema
      .pipe(z.number().min(0))
      .nullish()
      .describe("Deprecated: Use `sale.amount` instead.")
      .meta({ deprecated: true }),
    invoiceId: z
      .string()
      .nullish()
      .describe("Deprecated: Use `sale.invoiceId` instead.")
      .meta({ deprecated: true }),
    productId: z
      .string()
      .nullish()
      .describe("Deprecated: Use `sale.metadata.productId` instead.")
      .meta({ deprecated: true }),
  })
  .superRefine((data, ctx) => {
    if (data.importStripeInvoices) {
      const conflicts = [
        data.sale != null && "sale",
        data.date != null && "date",
        data.saleAmount != null && "saleAmount",
        data.saleEventDate != null && "saleEventDate",
        (data.invoiceId != null || data.sale?.invoiceId != null) && "invoiceId",
        (data.productId != null || data.sale?.metadata?.productId != null) &&
          "productId",
      ].filter((field): field is string => Boolean(field));

      if (conflicts.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${conflicts.map((field) => `\`${field}\``).join(", ")} cannot be provided when \`importStripeInvoices\` is enabled.`,
          path: [conflicts[0]],
        });
      }
      return;
    }

    const saleAmount = data.sale?.amount ?? data.saleAmount;

    if (saleAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`sale.amount` or `saleAmount` is required when `importStripeInvoices` is false.",
        path: data.sale ? ["sale", "amount"] : ["saleAmount"],
      });
      return;
    }

    if (saleAmount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sale amount cannot be 0.",
        path: data.sale?.amount != null ? ["sale", "amount"] : ["saleAmount"],
      });
    }
  });

export const createManualCommissionBodySchema = z
  .discriminatedUnion("type", [
    createCustomCommissionSchema,
    createLeadCommissionSchema,
    createSaleCommissionSchema,
  ])
  .superRefine((data, ctx) => {
    if (data.type === "custom") {
      if (data.amount < 0 && !data.description?.trim()) {
        ctx.addIssue({
          code: "custom",
          message:
            "`description` is required when creating a clawback (negative amount).",
          path: ["description"],
        });
      }
    }
  });

export const createCommissionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
