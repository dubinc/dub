import {
  DUB_PARTNERS_ANALYTICS_INTERVAL,
  intervals,
} from "@/lib/analytics/constants";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { parseDateSchema } from "./utils";

export const ProgramSaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(CommissionStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramSaleResponseSchema = ProgramSaleSchema.merge(
  z.object({
    customer: CustomerSchema,
    partner: PartnerSchema,
  }),
);

export const getProgramSalesQuerySchema = z
  .object({
    status: z.nativeEnum(CommissionStatus).optional(),
    sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    interval: z.enum(intervals).default(DUB_PARTNERS_ANALYTICS_INTERVAL),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
    customerId: z.string().optional(),
    payoutId: z.string().optional(),
    partnerId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const getProgramSalesCountQuerySchema = getProgramSalesQuerySchema.omit({
  page: true,
  pageSize: true,
  sortOrder: true,
  sortBy: true,
});
