import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "../zod/schemas/misc";
import { centsSchemaWithDefault } from "../zod/schemas/utils";
import { PARTNER_REFERRAL_TRIGGER } from "./constants";

export const referralRewardConfigSchema = z
  .object({
    trigger: z.enum(PARTNER_REFERRAL_TRIGGER),
    commissionsThresholdInCents: z.number().int().min(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.trigger === "commissionThreshold" &&
      data.commissionsThresholdInCents == null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["commissionsThresholdInCents"],
        message: "Please enter a commission threshold amount.",
      });
    }
  });

// Stats from referred partners
export const partnerReferralStatsSchema = z.object({
  totalPartners: z.number(),
  totalConversions: z.number(),
  totalSaleAmount: z.number(),
});

// TODO:
// We're repeating the program vs network schema, needs some cleanup

export const referredPartnerSchema = z.object({
  id: z.string(),
  email: z.string(),
  country: z.string().nullable(),
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

// Dub Partner Network referrals
export const networkReferralSchema = z.object({
  id: z.string(),
  email: z.string(),
  country: z.string().nullable(),
  createdAt: z.date(),
  earnings: centsSchemaWithDefault,
});

export const getNetworkReferralsQuerySchema = z
  .object({
    country: z.enum(Object.keys(COUNTRIES)).optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const getNetworkReferralsCountQuerySchema =
  getNetworkReferralsQuerySchema
    .omit({
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country"]).optional(),
    });
