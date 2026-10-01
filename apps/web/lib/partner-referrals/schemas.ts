import { COUNTRIES } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "../zod/schemas/misc";
import { PartnerSchema } from "../zod/schemas/partners";
import { centsSchemaWithDefault } from "../zod/schemas/utils";

export const partnerReferralSchema = z.object({
  referredBy: PartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
  stats: z.object({
    totalPartners: z.number(),
    totalConversions: z.number(),
    totalSaleAmount: z.number(),
  }),
});

export const referredPartnerSchema = PartnerSchema.pick({
  id: true,
  email: true,
  country: true,
}).extend({
  programEnrollment: z.object({
    createdAt: z.date(),
    status: z.enum(ProgramEnrollmentStatus),
    earnings: centsSchemaWithDefault,
  }),
});

export const getReferredPartnersQuerySchema = z
  .object({
    country: z.enum(Object.keys(COUNTRIES)).optional(),
    status: z.enum(ProgramEnrollmentStatus).optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const getReferredPartnersCountQuerySchema =
  getReferredPartnersQuerySchema
    .omit({
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country", "status"]).optional(),
    });

export const networkReferralSchema = PartnerSchema.pick({
  id: true,
  email: true,
  country: true,
  createdAt: true,
}).extend({
  totalEarnings: centsSchemaWithDefault,
  activeProgramsCount: z.number().int().nonnegative(),
});

export const getNetworkReferralsQuerySchema = z.object({}).extend(
  getPaginationQuerySchema({
    pageSize: 100,
  }),
);

export const networkReferralsStatsSchema = z.object({
  count: z.number().int().nonnegative(),
  totalEarnings: z.number().int(),
});

export const networkReferralsTimeseriesSchema = z.object({
  start: z.string(),
  partners: z.number().int().nonnegative(),
  earnings: z.number().int(),
});

export const attributeReferringPartnerBodySchema = z.object({
  referredByPartnerId: z
    .string()
    .describe(
      "The ID of the partner who referred this partner. The referring partner must be approved in your program.",
    ),
  createCommissionsForPastEvents: z
    .boolean()
    .default(false)
    .describe(
      "When true, enqueue referral commissions for this partner's past eligible events. Commissions are created asynchronously, and only when the referring partner has a referral reward.",
    ),
});

export const attributeReferringPartnerSchema =
  attributeReferringPartnerBodySchema.extend({
    workspaceId: z.string(),
    partnerId: z.string(),
  });
