import { ReferralStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";

export const partnerReferralSchema = z.object({
  id: z.string().describe("The referral's unique ID."),
  programId: z.string().describe("The program ID this referral belongs to."),
  partnerId: z.string().describe("The partner ID who made this referral."),
  name: z.string().describe("The name of the referred person."),
  email: z.email().describe("The email of the referred person."),
  company: z.string().describe("The company of the referred person."),
  status: z.enum(ReferralStatus).describe("The status of the referral."),
  formData: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe("Additional form data submitted with the referral."),
  createdAt: z.date().describe("The date when the referral was created."),
  updatedAt: z.date().describe("The date when the referral was last updated."),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }).describe("The partner who made this referral."),
});

export const getPartnerReferralsQuerySchema = z
  .object({
    partnerId: z
      .string()
      .optional()
      .describe("Filter referrals by partner ID."),
    status: z
      .enum(ReferralStatus)
      .optional()
      .describe("Filter referrals by status."),
    search: z
      .string()
      .optional()
      .describe("Search referrals by name or email."),
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

export const qualifyPartnerReferralSchema = z.object({
  referralId: z.string(),
  workspaceId: z.string(),
});

export const unqualifyPartnerReferralSchema = z.object({
  referralId: z.string(),
  workspaceId: z.string(),
});
