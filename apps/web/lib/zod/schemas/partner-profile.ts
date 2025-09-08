import {
  DATE_RANGE_INTERVAL_PRESETS,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import { CommissionType, ProgramEnrollmentStatus } from "@prisma/client";
import { z } from "zod";
import { analyticsQuerySchema, eventsQuerySchema } from "./analytics";
import { BountySchema, BountySubmissionSchema } from "./bounties";
import {
  CommissionSchema,
  getCommissionsCountQuerySchema,
  getCommissionsQuerySchema,
} from "./commissions";
import { customerActivityResponseSchema } from "./customer-activity";
import { CustomerEnrichedSchema } from "./customers";
import { LinkSchema } from "./links";
import { workflowConditionSchema } from "./workflows";

export const PartnerEarningsSchema = CommissionSchema.omit({
  userId: true,
  invoiceId: true,
}).merge(
  z.object({
    customer: z
      .object({
        id: z.string(),
        email: z
          .string()
          .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "****")),
      })
      .nullable(),
    link: LinkSchema.pick({
      id: true,
      shortLink: true,
      url: true,
    }).nullish(),
  }),
);

export const getPartnerEarningsQuerySchema = getCommissionsQuerySchema
  .omit({
    partnerId: true,
    sortBy: true,
  })
  .merge(
    z.object({
      interval: z
        .enum(DATE_RANGE_INTERVAL_PRESETS)
        .default(DUB_PARTNERS_ANALYTICS_INTERVAL),
      type: z.nativeEnum(CommissionType).optional(),
      linkId: z.string().optional(),
      sortBy: z.enum(["createdAt", "amount", "earnings"]).default("createdAt"),
    }),
  );

export const getPartnerEarningsCountQuerySchema = getCommissionsCountQuerySchema
  .omit({
    partnerId: true,
  })
  .merge(
    z.object({
      interval: z
        .enum(DATE_RANGE_INTERVAL_PRESETS)
        .default(DUB_PARTNERS_ANALYTICS_INTERVAL),
      type: z.nativeEnum(CommissionType).optional(),
      linkId: z.string().optional(),
      groupBy: z.enum(["linkId", "customerId", "status", "type"]).optional(),
    }),
  );

export const getPartnerEarningsTimeseriesSchema =
  getPartnerEarningsCountQuerySchema.extend({
    timezone: z.string().optional(),
  });

export const PartnerProfileLinkSchema = LinkSchema.pick({
  id: true,
  domain: true,
  key: true,
  shortLink: true,
  url: true,
  clicks: true,
  leads: true,
  sales: true,
  saleAmount: true,
  comments: true,
  couponCode: true,
}).extend({
  createdAt: z.string().or(z.date()),
});

export const PartnerProfileCustomerSchema = CustomerEnrichedSchema.pick({
  id: true,
  country: true,
  createdAt: true,
}).extend({
  email: z
    .string()
    .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "****")),
  activity: customerActivityResponseSchema,
});

export const partnerProfileAnalyticsQuerySchema = analyticsQuerySchema.omit({
  externalId: true,
  tenantId: true,
  programId: true,
  partnerId: true,
  tagId: true,
  tagIds: true,
  folderId: true,
});

export const partnerProfileEventsQuerySchema = eventsQuerySchema.omit({
  externalId: true,
  tenantId: true,
  programId: true,
  partnerId: true,
  tagId: true,
  tagIds: true,
  folderId: true,
});

export const partnerProfileProgramsQuerySchema = z.object({
  includeRewardsDiscounts: z.coerce.boolean().optional(),
  status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
});

export const partnerProfileProgramsCountQuerySchema =
  partnerProfileProgramsQuerySchema.pick({ status: true });

export const partnerNotificationTypes = z.enum([
  "commissionCreated",
  "applicationApproved",
]);

export const PartnerBountySchema = BountySchema.omit({
  groups: true,
}).extend({
  submission: BountySubmissionSchema.nullable(),
  performanceCondition: workflowConditionSchema.nullable().default(null),
  partner: z.object({
    totalClicks: z.number(),
    totalLeads: z.number(),
    totalConversions: z.number(),
    totalSales: z.number(),
    totalSaleAmount: z.number(),
    totalCommissions: z.number(),
  }),
});
