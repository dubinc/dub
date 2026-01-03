import {
  DATE_RANGE_INTERVAL_PRESETS,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import { PARTNER_CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/constants/partner-profile";
import {
  CommissionType,
  PartnerProfileType,
  PartnerRole,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import * as z from "zod/v4";
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
import { getPaginationQuerySchema } from "./misc";
import { payoutsQuerySchema } from "./payouts";
import { workflowConditionSchema } from "./workflows";

export const PartnerEarningsSchema = CommissionSchema.omit({
  userId: true,
  invoiceId: true,
}).extend({
  customer: z
    .object({
      id: z.string(),
      email: z.string(),
      country: z.string().nullish(),
    })
    .nullable(),
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    url: true,
  }).nullish(),
});

export const getPartnerEarningsQuerySchema = getCommissionsQuerySchema
  .omit({
    partnerId: true,
    sortBy: true,
  })
  .extend({
    interval: z
      .enum(DATE_RANGE_INTERVAL_PRESETS)
      .default(DUB_PARTNERS_ANALYTICS_INTERVAL),
    timezone: z.string().optional(),
    type: z.enum(CommissionType).optional(),
    linkId: z.string().optional(),
    sortBy: z.enum(["createdAt", "amount", "earnings"]).default("createdAt"),
  });

export const getPartnerEarningsCountQuerySchema = getCommissionsCountQuerySchema
  .omit({
    partnerId: true,
  })
  .extend({
    interval: z
      .enum(DATE_RANGE_INTERVAL_PRESETS)
      .default(DUB_PARTNERS_ANALYTICS_INTERVAL),
    timezone: z.string().optional(),
    type: z.enum(CommissionType).optional(),
    linkId: z.string().optional(),
    groupBy: z.enum(["linkId", "customerId", "status", "type"]).optional(),
  });

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
}).extend({
  createdAt: z.string().or(z.date()),
  partnerGroupDefaultLinkId: z.string().nullish(),
  discountCode: z.string().nullable().default(null),
});

export const PartnerProfileCustomerSchema = CustomerEnrichedSchema.pick({
  id: true,
  email: true,
  country: true,
  createdAt: true,
}).extend({
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
  status: z.enum(ProgramEnrollmentStatus).optional(),
});

export const partnerProfileProgramsCountQuerySchema =
  partnerProfileProgramsQuerySchema.pick({ status: true });

export const partnerNotificationTypes = z.enum([
  "commissionCreated",
  "applicationApproved",
  "newMessageFromProgram",
  "marketingCampaign",
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

export const invitePartnerUserSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }),
  role: z.enum(PartnerRole),
});

export const getPartnerUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(PartnerRole).optional(),
});

export const partnerUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string(),
  role: z.enum(PartnerRole),
  image: z.string().nullish(),
  createdAt: z.date(),
});

export const partnerProfileChangeHistoryLogSchema = z.array(
  z.union([
    z.object({
      field: z.literal("country"),
      from: z.string(),
      to: z.string(),
      changedAt: z.coerce.date(),
    }),
    z.object({
      field: z.literal("profileType"),
      from: z.enum(PartnerProfileType),
      to: z.enum(PartnerProfileType),
      changedAt: z.coerce.date(),
    }),
  ]),
);

export const partnerProfilePayoutsQuerySchema = payoutsQuerySchema.extend({
  sortBy: payoutsQuerySchema.shape.sortBy.default("initiatedAt"),
});

export const getPartnerCustomersQuerySchema = z
  .object({
    search: z
      .string()
      .optional()
      .describe(
        "A search query to filter customers by email or name. Only available if customer data sharing is enabled.",
      ),
    country: z
      .string()
      .optional()
      .describe(
        "A filter on the list based on the customer's `country` field.",
      ),
    linkId: z
      .string()
      .optional()
      .describe(
        "A filter on the list based on the customer's `linkId` field (the referral link ID).",
      ),
    sortBy: z
      .enum(["createdAt", "saleAmount"])
      .optional()
      .default("createdAt")
      .describe(
        "The field to sort the customers by. The default is `createdAt`.",
      ),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("desc")
      .describe("The sort order. The default is `desc`."),
  })
  .extend(
    getPaginationQuerySchema({ pageSize: PARTNER_CUSTOMERS_MAX_PAGE_SIZE }),
  );

export const getPartnerCustomersCountQuerySchema =
  getPartnerCustomersQuerySchema
    .omit({
      sortBy: true,
      sortOrder: true,
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country", "linkId"]).optional(),
    });
