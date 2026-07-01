import { REACH_TIER_KEYS } from "@/lib/api/network/reach-tiers";
import { processKey } from "@/lib/api/links/utils";
import {
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
} from "@/lib/partner-content-search/constants";
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
    platform: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .pipe(z.array(z.enum(PlatformType)))
      .optional(),
    reach: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .pipe(z.array(z.enum(REACH_TIER_KEYS)))
      .optional(),
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

const PARTNER_NETWORK_CONTENT_SEARCH_DEFAULT_PARTNER_LIMIT = 20;

// POST /api/network/partners/content-search - semantic search over indexed partner content
export const partnerNetworkContentSearchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  platforms: z.array(z.enum(PlatformType)).min(1).optional(),
  reach: z.array(z.enum(REACH_TIER_KEYS)).min(1).optional(),
  country: z.string().trim().min(1).optional(),
  partnerIds: z.array(z.string()).min(1).max(100).optional(),
  starred: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_PARTNER_LIMIT)
    .default(PARTNER_NETWORK_CONTENT_SEARCH_DEFAULT_PARTNER_LIMIT),
  chunksPerPartner: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER)
    .default(PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER),
  rerank: z.boolean().default(true),
});

// Content-search response schema — shared by the route validator and SWR types.

export const partnerContentMatchSourceSchema = z.enum([
  "transcript",
  "creatorText",
]);

export const partnerContentMatchEvidenceSchema = z.object({
  primarySource: partnerContentMatchSourceSchema.nullable(),
  sources: z.array(partnerContentMatchSourceSchema),
  transcriptScore: z.number().nullable(),
  creatorTextScore: z.number().nullable(),
  creatorTextWeight: z.number(),
  weight: z.number(),
});

const partnerContentSearchChunkSchema = z.object({
  chunkId: z.string(),
  partnerContentItemId: z.string(),
  platform: z.object({
    type: z.string(),
    identifier: z.string(),
  }),
  content: z.object({
    platformContentId: z.string(),
    url: z.string(),
    type: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    thumbnailUrl: z.string().nullable(),
    publishedAt: z.string().nullable(),
    durationMs: z.number().nullable(),
    viewCount: z.number().nullable(),
    likeCount: z.number().nullable(),
    commentCount: z.number().nullable(),
    shareCount: z.number().nullable(),
    saveCount: z.number().nullable(),
  }),
  chunk: z.object({
    source: z.string(),
    text: z.string(),
    startMs: z.number().nullable(),
    endMs: z.number().nullable(),
  }),
  score: z.number(),
  cosineScore: z.number().nullish(),
  rerankScore: z.number().nullish(),
  matchEvidence: partnerContentMatchEvidenceSchema.optional(),
});

const partnerContentSearchContentMatchSchema = z.object({
  partnerContentItemId: z.string(),
  platform: z.string(),
  publishedAt: z.string().nullable(),
  viewCount: z.number().nullable(),
  matched: z.boolean(),
  matchScore: z.number().nullable(),
  matchEvidence: partnerContentMatchEvidenceSchema,
});

const partnerContentTopicFitBandSchema = z.enum([
  "consistent",
  "frequent",
  "occasional",
  "one-off",
  "none",
]);

const partnerContentSearchMatchSummarySchema = z.object({
  matchedContentCount: z.number(),
  strongMatchedContentCount: z.number(),
  partialMatchedContentCount: z.number(),
  transcriptMatchedContentCount: z.number(),
  creatorTextMatchedContentCount: z.number(),
  creatorTextOnlyContentCount: z.number(),
  weightedMatchedContentCount: z.number(),
  weightedMatchedContentScore: z.number(),
  recentContentCount: z.number(),
  totalContentCount: z.number(),
  topicFit: z.number(),
  band: partnerContentTopicFitBandSchema,
  followers: z.number().nullable(),
  medianViews: z.number().nullable(),
  lastOnTopicAt: z.string().nullable(),
  topPlatforms: z.array(z.string()),
  platforms: z.array(z.string()),
  sources: z.array(z.string()),
  oldestPublishedAt: z.string().nullable(),
  newestPublishedAt: z.string().nullable(),
  contentMatches: z.array(partnerContentSearchContentMatchSchema),
});

const partnerContentSearchResponsePartnerSchema = z.object({
  partnerId: z.string(),
  score: z.number(),
  cosineScore: z.number().nullish(),
  rerankScore: z.number().nullish(),
  // Profile fields on `partner` only; z.custom skips re-parsing nested transforms.
  partner: z.custom<z.infer<typeof NetworkPartnerSchema>>(),
  chunks: z.array(partnerContentSearchChunkSchema),
  matchSummary: partnerContentSearchMatchSummarySchema.nullable(),
});

export const partnerNetworkContentSearchResponseSchema = z.object({
  success: z.boolean(),
  query: z.string().nullable(),
  platforms: z.array(z.enum(PlatformType)).nullable(),
  country: z.string().nullable(),
  candidateChunkCount: z.number(),
  embeddingModel: z.string(),
  reranked: z.boolean(),
  rerankModel: z.string().nullable(),
  resultCount: z.number(),
  partners: z.array(partnerContentSearchResponsePartnerSchema),
});

export type PartnerNetworkContentSearchResponse = z.infer<
  typeof partnerNetworkContentSearchResponseSchema
>;
export type PartnerNetworkContentSearchPartner =
  PartnerNetworkContentSearchResponse["partners"][number];
export type PartnerContentMatchEvidence = z.infer<
  typeof partnerContentMatchEvidenceSchema
>;
export type PartnerContentMatchSource = z.infer<
  typeof partnerContentMatchSourceSchema
>;
