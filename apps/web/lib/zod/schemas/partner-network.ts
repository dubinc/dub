import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
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

export const PARTNER_NETWORK_PARTNERS_MAX_PAGE_SIZE = 50;

export const partnerNetworkPartnersStatusSchema = z.enum([
  "discover",
  "invited",
  "recruited",
]);

export const getPartnerNetworkPartnersQuerySchema = z
  .object({
    status: partnerNetworkPartnersStatusSchema.default("discover"),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: PARTNER_NETWORK_PARTNERS_MAX_PAGE_SIZE,
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
  }),
);

export const starPartnerSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  starred: z.boolean().default(true),
});
