import {
  IndustryInterest,
  PreferredEarningStructure,
  SalesChannel,
} from "@dub/prisma/client";
import { z } from "zod";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";

export const PARTNER_CONVERSION_SCORES = [
  "low",
  "average",
  "good",
  "high",
  "excellent",
] as const;

export const PARTNER_CONVERSION_SCORE_RATES: Record<
  (typeof PARTNER_CONVERSION_SCORES)[number],
  number
> = {
  low: 0,
  average: 0.005,
  good: 0.01,
  high: 0.03,
  excellent: 0.05,
};

export const PartnerConversionScoreSchema = z.enum(PARTNER_CONVERSION_SCORES);

export const PARTNER_NETWORK_MAX_PAGE_SIZE = 100;

export const partnerNetworkPartnersStatusSchema = z.enum([
  "discover",
  "invited",
  "recruited",
]);

export const getPartnerNetworkPartnersQuerySchema = z
  .object({
    status: partnerNetworkPartnersStatusSchema.default("discover"),
    country: z.string().optional(),
    starred: booleanQuerySchema.nullish(),
    partnerIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
    industryInterests: z
      .preprocess(
        (v) => (typeof v === "string" ? v.split(",") : v),
        z.array(z.nativeEnum(IndustryInterest)),
      )
      .optional(),
    salesChannels: z
      .preprocess(
        (v) => (typeof v === "string" ? v.split(",") : v),
        z.array(z.nativeEnum(SalesChannel)),
      )
      .optional(),
    preferredEarningStructures: z
      .preprocess(
        (v) => (typeof v === "string" ? v.split(",") : v),
        z.array(z.nativeEnum(PreferredEarningStructure)),
      )
      .optional(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: PARTNER_NETWORK_MAX_PAGE_SIZE,
    }),
  );

export const getPartnerNetworkPartnersCountQuerySchema =
  getPartnerNetworkPartnersQuerySchema
    .omit({
      status: true,
      page: true,
      pageSize: true,
    })
    .extend({
      status: partnerNetworkPartnersStatusSchema.nullish(),
      groupBy: z.enum(["status", "country"]).default("status"),
    });

export const PartnerNetworkPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  companyName: true,
  country: true,
  profileType: true,
  image: true,
  description: true,
  discoverableAt: true,

  monthlyTraffic: true,
  industryInterests: true,
  preferredEarningStructures: true,
  salesChannels: true,

  website: true,
  websiteVerifiedAt: true,
  youtube: true,
  youtubeVerifiedAt: true,
  youtubeSubscriberCount: true,
  youtubeViewCount: true,
  twitter: true,
  twitterVerifiedAt: true,
  linkedin: true,
  linkedinVerifiedAt: true,
  instagram: true,
  instagramVerifiedAt: true,
  tiktok: true,
  tiktokVerifiedAt: true,
}).merge(
  z.object({
    lastConversionAt: z.date().nullable(),
    conversionScore: PartnerConversionScoreSchema.nullable(),
    starredAt: z.date().nullable(),
    invitedAt: z.date().nullable(),
    ignoredAt: z.date().nullable(),
    recruitedAt: z.date().nullable(),
  }),
);

export const updateDiscoveredPartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  starred: z.boolean().optional(),
  ignored: z.boolean().optional(),
});

export const invitePartnerFromNetworkSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  groupId: z.string().nullish().default(null),
});
