import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { parseDateSchema } from "./utils";

export const CommissionSchema = z.object({
  id: z.string().describe("The commission's unique ID on Dub.").openapi({
    example: "cm_1JVR7XRCSR0EDBAF39FZ4PMYE",
  }),
  type: z.enum(["click", "lead", "sale"]).optional(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(CommissionStatus),
  invoiceId: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CommissionResponseSchema = CommissionSchema.merge(
  z.object({
    quantity: z.number(),
    partner: PartnerSchema,
    customer: CustomerSchema.nullable(), // customer can be null for click-based commissions
  }),
);

export const getCommissionsQuerySchema = z
  .object({
    type: z.enum(["click", "lead", "sale"]).optional(),
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
  linkId: z.string(),
  customerId: z.string(),
  saleEventDate: parseDateSchema.nullish(),
  saleAmount: z.number().min(0).nullish(),
  invoiceId: z.string().nullish(),
  leadEventDate: parseDateSchema.nullish(),
  leadEventName: z.string().nullish(),
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
