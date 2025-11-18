import { z } from "zod";
import { PartnerSchema } from "../zod/schemas/partners";
import { ProgramSchema } from "../zod/schemas/programs";

export const fraudPartnerContext = z.object({
  program: ProgramSchema.pick({ id: true }).optional(),
  partner: PartnerSchema.pick({
    id: true,
    email: true,
    payoutMethodHash: true,
    website: true,
    websiteVerifiedAt: true,
    youtube: true,
    youtubeVerifiedAt: true,
    twitter: true,
    twitterVerifiedAt: true,
    linkedin: true,
    linkedinVerifiedAt: true,
    instagram: true,
    instagramVerifiedAt: true,
    tiktok: true,
    tiktokVerifiedAt: true,
  }).extend({
    payoutMethodHash: z.string().nullable(),
  }),
});

export const fraudEventContext = z.object({
  program: z.object({
    id: z.string(),
  }),
  partner: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  customer: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  commission: z.object({
    id: z.string().nullable().optional(),
  }),
  link: z.object({
    id: z.string().nullable().optional(),
  }),
  click: z.object({
    url: z.string().nullable(),
    referer: z.string().nullable(),
    referer_url: z.string().nullable().optional(),
  }),
  event: z.object({
    id: z.string(),
  }),
});
