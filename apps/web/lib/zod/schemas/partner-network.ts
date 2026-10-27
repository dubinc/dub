import { processKey } from "@/lib/api/links/utils";
import { PlatformType } from "@prisma/client";
import * as z from "zod/v4";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { PartnerSchema, partnerPlatformSchema } from "./partners";

export const PARTNER_CONVERSION_SCORES = [
  "unknown",
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
  unknown: 0,
  low: 0,
  average: 0.005,
  good: 0.01,
  high: 0.03,
  excellent: 0.05,
};

export const PartnerConversionScoreSchema = z.enum(PARTNER_CONVERSION_SCORES);

export const PARTNER_NETWORK_MAX_PAGE_SIZE = 100;

export const NetworkPartnersStatusSchema = z.enum([
  "discover",
  "invited",
  "recruited",
  "ignored",
]);

export const getNetworkPartnersQuerySchema = z
  .object({
    status: NetworkPartnersStatusSchema.default("discover"),
    country: z.string().optional(),
    starred: booleanQuerySchema.nullish(),
    sortBy: z.enum(["relevance", "subscribers"]).default("relevance"),
    platform: z.enum(PlatformType).optional(),
    partnerIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
  })
  .extend(
    getPaginationQuerySchema({ pageSize: PARTNER_NETWORK_MAX_PAGE_SIZE }),
  );

export const getNetworkPartnersCountQuerySchema = getNetworkPartnersQuerySchema
  .omit({
    status: true,
    page: true,
    pageSize: true,
  })
  .extend({
    status: NetworkPartnersStatusSchema.nullish(),
    groupBy: z
      .enum(["status", "country", "platform", "subscribers"])
      .default("status"),
  });

export const NetworkPartnerSchema = PartnerSchema.pick({
  id: true,
  name: true,
  companyName: true,
  country: true,
  profileType: true,
  image: true,
  description: true,
  createdAt: true,
  networkStatus: true,
  monthlyTraffic: true,
  preferredEarningStructures: true,
  salesChannels: true,
  identityVerificationStatus: true,
  identityVerifiedAt: true,
}).extend({
  starredAt: z.date().nullable(),
  invitedAt: z.date().nullable(),
  ignoredAt: z.date().nullable(),
  recruitedAt: z.date().nullable(),
  categories: z.array(z.string()),
  platforms: z.array(partnerPlatformSchema),
});

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
  username: z
    .string()
    .max(100)
    .nullish()
    .refine(
      (v) => (v ? processKey({ domain: "d.to", key: v }) !== null : true),
      {
        message: "Invalid username. Must be a URL-friendly string.",
      },
    ),
  emailSubject: z.string().trim().max(255).optional(),
  emailTitle: z.string().trim().max(255).optional(),
  emailBody: z.string().trim().max(3000).optional(),
});
