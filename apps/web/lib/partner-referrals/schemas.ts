import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
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
