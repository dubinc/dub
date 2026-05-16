import {
  FraudAlertStatus,
  PartnerNetworkStatus,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { partnerProfileChangeHistoryLogSchema } from "./partner-profile";
import {
  EnrolledPartnerSchemaExtended,
  partnerPlatformSchema,
  PartnerSchema,
} from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";
import { centsSchema, parseDateSchema } from "./utils";

export const adminCommissionsDataSchema = z.object({
  programs: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      url: z.string(),
      logo: z.string(),
      addedToMarketplaceAt: z.date().nullable(),
      commissions: z.number(),
      fees: z.number(),
    }),
  ),
  timeseries: z.array(
    z.object({
      start: parseDateSchema,
      commissions: z.number(),
    }),
  ),
});

export const adminNetworkPartnerSchema = EnrolledPartnerSchemaExtended.pick({
  id: true,
  name: true,
  companyName: true,
  email: true,
  image: true,
  description: true,
  country: true,
  createdAt: true,
  defaultPayoutMethod: true,
  paypalEmail: true,
  stripeConnectId: true,
  payoutsEnabledAt: true,
  identityVerifiedAt: true,
  monthlyTraffic: true,
  industryInterests: true,
  preferredEarningStructures: true,
  salesChannels: true,
}).extend({
  submittedAt: z.date().nullable(),
  reviewedAt: z.date().nullable(),
  networkStatus: PartnerSchema.shape.networkStatus,
  platforms: z.array(partnerPlatformSchema),
  changeHistoryLog: partnerProfileChangeHistoryLogSchema.nullable(),
  programs: z.array(
    ProgramSchema.pick({
      id: true,
      name: true,
      logo: true,
      slug: true,
      url: true,
    }).extend({
      status: z.enum(ProgramEnrollmentStatus),
      totalSaleAmount: centsSchema,
      totalCommissions: centsSchema,
    }),
  ),
  duplicatePartnerAccounts: z.array(
    PartnerSchema.pick({
      id: true,
      name: true,
      email: true,
      image: true,
      country: true,
    }),
  ),
});

export const adminNetworkPartnerQuerySchema = z
  .object({
    networkStatus: z.enum(PartnerNetworkStatus).optional(),
    country: z.string().optional(),
    search: z.string().trim().min(1).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const adminFraudAlertSchema = z.object({
  id: z.string(),
  reason: z.string(),
  status: z.enum(FraudAlertStatus),
  reviewedAt: z.date().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.date(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
  program: ProgramSchema.pick({
    id: true,
    name: true,
    logo: true,
  }),
  reviewedBy: UserSchema.pick({
    id: true,
    name: true,
  }).nullable(),
});
