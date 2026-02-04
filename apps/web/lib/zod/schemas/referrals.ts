import { ReferralStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { referralFormDataSchema } from "./referral-form";

export const referralSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  name: z.string(),
  email: z.email(),
  company: z.string(),
  status: z.enum(ReferralStatus),
  formData: z.array(referralFormDataSchema).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
});

export const getPartnerReferralsQuerySchema = z
  .object({
    partnerId: z.string().optional(),
    status: z.enum(ReferralStatus).optional(),
    search: z.string().optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const getPartnerReferralsCountQuerySchema =
  getPartnerReferralsQuerySchema
    .omit({
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["status", "partnerId"]).optional(),
    });

export const partnerReferralsCountByStatusSchema = z.object({
  status: z.enum(ReferralStatus),
  _count: z.number(),
});

export const partnerReferralsCountByPartnerIdSchema = z.object({
  partnerId: z.string(),
  _count: z.number(),
});

export const partnerReferralsCountResponseSchema = z.union([
  z.array(partnerReferralsCountByStatusSchema),
  z.array(partnerReferralsCountByPartnerIdSchema),
  z.number(),
]);

export const createPartnerReferralSchema = z.object({
  programId: z.string(),
  formData: z.record(z.string(), z.unknown()), // Contains all form fields including name, email, company
});

export const updateReferralSchema = z.object({
  referralId: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  company: z.string().min(1, "Company is required"),
  formData: z.array(referralFormDataSchema).nullable().optional(),
});

const updateReferralStatusBaseSchema = z.object({
  referralId: z.string(),
  workspaceId: z.string(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export const updateReferralStatusSchema = z.discriminatedUnion("status", [
  updateReferralStatusBaseSchema.extend({
    status: z.literal("pending"),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("qualified"),
    externalId: z.string().trim().optional(),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("meeting"),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("negotiation"),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("unqualified"),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("closedWon"),
    saleAmount: z
      .number()
      .min(0, "Sale amount must be greater than or equal to 0"),
    stripeCustomerId: z.string().optional(),
  }),

  updateReferralStatusBaseSchema.extend({
    status: z.literal("closedLost"),
  }),
]);
