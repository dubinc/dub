import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { CommissionStatus, CommissionType } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
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
  invoiceId: z.string().nullish(),
  description: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CommissionResponseSchema = CommissionSchema.merge(
  z.object({
    quantity: z.number(),
    partner: PartnerSchema,
    customer: CustomerSchema.nullish(), // customer can be null for click-based / custom commissions
  }),
);

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
      .describe("Filter the list of commissions by the associated partner."),
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
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const getCommissionsCountQuerySchema = getCommissionsQuerySchema.omit({
  page: true,
  pageSize: true,
  sortOrder: true,
  sortBy: true,
});

export const createCommissionSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),

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
