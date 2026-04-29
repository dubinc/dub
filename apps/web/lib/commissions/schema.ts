import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { CommissionStatus } from "@dub/prisma/client";
import * as z from "zod/v4";

const sharedCommissionAnalyticsFilterSchema = analyticsQuerySchema
  .pick({
    start: true,
    end: true,
    interval: true,
    timezone: true,
  })
  .extend({
    groupId: z.string().optional(),
    partnerId: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(CommissionStatus).optional(),
  });

// Commission program analytics (workspace dashboard)
export const commissionAnalyticsQuerySchema =
  sharedCommissionAnalyticsFilterSchema.extend({
    groupBy: z.enum(["timeseries", "partnerId", "groupId", "type"]),
  });

const commissionTotalsSchema = z.object({
  earnings: z.number(),
  count: z.number(),
});

const commissionCategoryRowSchema = commissionTotalsSchema.extend({
  key: z.string(),
  label: z.string(),
});

const commissionTimeseriesRowSchema = commissionTotalsSchema.extend({
  start: z.string(),
});

const commissionPartnerIdRowSchema = z.object({
  partnerId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  country: z.string().nullable(),
  earnings: z.number(),
  commissionCount: z.number(),
});

export const commissionAnalyticsSchema = {
  type: z.array(commissionCategoryRowSchema),

  groupId: z.array(commissionCategoryRowSchema),

  timeseries: z.array(commissionTimeseriesRowSchema),

  partnerId: z.array(commissionPartnerIdRowSchema),
} as const;

export type CommissionAnalyticsQuery = z.infer<
  typeof commissionAnalyticsQuerySchema
>;

export type CommissionAnalyticsGroupBy = CommissionAnalyticsQuery["groupBy"];

export type CommissionAnalyticsByGroup = {
  [K in keyof typeof commissionAnalyticsSchema]: z.infer<
    (typeof commissionAnalyticsSchema)[K]
  >;
};

export type CommissionCategoryRow = CommissionAnalyticsByGroup["type"][number];

export type CommissionTimeseriesItem =
  CommissionAnalyticsByGroup["timeseries"][number];

export type CommissionAnalyticsPartnerRow =
  CommissionAnalyticsByGroup["partnerId"][number];
