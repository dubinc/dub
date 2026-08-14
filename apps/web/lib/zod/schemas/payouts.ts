import { ELIGIBLE_PAYOUTS_MAX_PAGE_SIZE } from "@/lib/constants/payouts";
import { CUTOFF_PERIOD_ENUM } from "@/lib/partners/cutoff-period";
import { PartnerPayoutMethod, PayoutMode, PayoutStatus } from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string({ error: "Please select a partner" }),
  amount: z
    .preprocess((val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    }, z.number())
    .optional(),
  description: z
    .string()
    .max(190, "Description must be less than 190 characters")
    .nullable(),
});

export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const payoutsQuerySchema = z
  .object({
    status: z
      .enum(PayoutStatus)
      .optional()
      .describe("Filter the list of payouts by their corresponding status."),
    partnerId: z
      .string()
      .optional()
      .describe(
        "Filter the list of payouts by the associated partner. When specified, takes precedence over `tenantId`.",
      ),
    tenantId: z
      .string()
      .optional()
      .describe(
        "Filter the list of payouts by the associated partner's `tenantId` (their unique ID within your database).",
      ),
    invoiceId: z
      .string()
      .optional()
      .describe(
        "Filter the list of payouts by invoice ID (the unique ID of the invoice you receive for each batch payout you process on Dub). Pending payouts will not have an invoice ID.",
      ),
    groupId: z
      .string()
      .optional()
      .describe(
        "Filter the list of payouts by the associated partner group. " +
          "Supports advanced filtering: single value, multiple values (comma-separated), or exclusion (prefix with `-`). " +
          "Examples: `group_abc`, `group_abc,group_xyz`, `-group_abc`.",
      ),
    sortBy: z
      .enum(["amount", "initiatedAt", "paidAt"])
      .default("amount")
      .describe("The field to sort the list of payouts by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("The sort order for the list of payouts."),
  })
  .extend(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const payoutsCountQuerySchema = payoutsQuerySchema
  .pick({
    status: true,
    partnerId: true,
    invoiceId: true,
    groupId: true,
    tenantId: true,
  })
  .extend({
    programId: z.string().optional(),
    groupBy: z.enum(["status"]).optional(),
    eligibility: z.enum(["eligible", "ineligible"]).optional(),
  });

export const PayoutSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(PayoutStatus),
  description: z.string().nullish(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  initiatedAt: z.date().nullable(),
  paidAt: z.date().nullable(),
  failureReason: z.string().nullish(),
  mode: z.enum(PayoutMode).nullable(),
  method: z.enum(PartnerPayoutMethod).nullable(),
  traceId: z.string().nullish(),
});

export const PayoutResponseSchema = PayoutSchema.extend({
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    defaultPayoutMethod: true,
    payoutsEnabledAt: true,
    country: true,
    groupId: true,
    tenantId: true,
  }),
  user: UserSchema.nullish(),
});

export const PartnerPayoutResponseSchema = PayoutResponseSchema.omit({
  partner: true,
}).extend({
  program: ProgramSchema.pick({
    id: true,
    name: true,
    slug: true,
    logo: true,
    minPayoutAmount: true,
    payoutMode: true,
  }),
});

export const payoutWebhookEventSchema = PayoutSchema.omit({
  failureReason: true,
}).extend({
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    country: true,
    tenantId: true,
    status: true,
  }),
});

const commaSeparatedIdsSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(",").filter(Boolean)));

const eligiblePayoutsInputSchema = z
  .object({
    cutoffPeriod: CUTOFF_PERIOD_ENUM,
    /** @deprecated Use `selectedPayoutIds`; kept for URL backwards compatibility. */
    selectedPayoutId: z.string().optional(),
    selectedPayoutIds: commaSeparatedIdsSchema.optional(),
    excludedPayoutIds: commaSeparatedIdsSchema.optional(),
  })
  .extend(
    getPaginationQuerySchema({ pageSize: ELIGIBLE_PAYOUTS_MAX_PAGE_SIZE }),
  );

function transformEligiblePayoutsSelection<
  T extends {
    selectedPayoutId?: string | undefined;
    selectedPayoutIds?: string[] | undefined;
    excludedPayoutIds?: string[] | undefined;
  },
>(data: T) {
  const {
    selectedPayoutId,
    selectedPayoutIds: rawSelected,
    excludedPayoutIds: rawExcluded,
    ...rest
  } = data;

  const merged = [
    ...new Set([
      ...(rawSelected ?? []),
      ...(selectedPayoutId ? [selectedPayoutId] : []),
    ]),
  ];

  return {
    ...rest,
    selectedPayoutIds: merged.length > 0 ? merged : undefined,
    excludedPayoutIds:
      rawExcluded && rawExcluded.length > 0 ? rawExcluded : undefined,
  };
}

export const eligiblePayoutsQuerySchema = eligiblePayoutsInputSchema
  .transform(transformEligiblePayoutsSelection)
  .superRefine((data, ctx) => {
    if (data.selectedPayoutIds?.length && data.excludedPayoutIds?.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "Cannot combine selectedPayoutIds with excludedPayoutIds in the same request.",
      });
    }
  });

export const eligiblePayoutsCountQuerySchema = eligiblePayoutsInputSchema
  .omit({ page: true, pageSize: true })
  .transform(transformEligiblePayoutsSelection)
  .superRefine((data, ctx) => {
    if (data.selectedPayoutIds?.length && data.excludedPayoutIds?.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "Cannot combine selectedPayoutIds with excludedPayoutIds in the same request.",
      });
    }
  });

export const PAYOUT_EXPORT_COLUMNS = [
  { id: "id", label: "ID", type: "string", default: true },
  { id: "amount", label: "Amount", type: "money", default: true },
  { id: "currency", label: "Currency", type: "string", default: true },
  { id: "status", label: "Status", type: "string", default: true },
  { id: "periodStart", label: "Period start", type: "date", default: true },
  { id: "periodEnd", label: "Period end", type: "date", default: true },
  { id: "initiatedAt", label: "Initiated at", type: "date", default: true },
  { id: "paidAt", label: "Paid at", type: "date", default: true },
  { id: "invoiceId", label: "Invoice ID", type: "string", default: false },
  { id: "description", label: "Description", type: "string", default: false },
  { id: "method", label: "Payout method", type: "string", default: false },
  { id: "traceId", label: "Payout trace ID", type: "string", default: false },
  {
    id: "failureReason",
    label: "Failure reason",
    type: "string",
    default: false,
  },
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
] as const;

type PayoutExportColumnId = (typeof PAYOUT_EXPORT_COLUMNS)[number]["id"];

export const DEFAULT_PAYOUT_EXPORT_COLUMNS = PAYOUT_EXPORT_COLUMNS.filter(
  (column) => column.default,
).map((column) => column.id);

export const payoutsExportQuerySchema = payoutsQuerySchema
  .omit({
    page: true,
    pageSize: true,
  })
  .extend({
    columns: z
      .string()
      .default(DEFAULT_PAYOUT_EXPORT_COLUMNS.join(","))
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .refine(
        (columns): columns is PayoutExportColumnId[] => {
          const validColumnIds = PAYOUT_EXPORT_COLUMNS.map((col) => col.id);

          return columns.every((column): column is PayoutExportColumnId =>
            validColumnIds.includes(column as PayoutExportColumnId),
          );
        },
        {
          message:
            "Invalid column IDs provided. Please check the available columns.",
        },
      ),
  });

export const payoutsExportCronInputSchema = payoutsExportQuerySchema.extend({
  workspaceId: z.string(),
  programId: z.string(),
  userId: z.string(),
});
