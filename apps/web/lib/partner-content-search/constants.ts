export const PARTNER_CONTENT_SEARCH_FEATURE_FLAG =
  "PARTNER_CONTENT_SEARCH_ENABLED";

export const PARTNER_CONTENT_SEARCH_ENV_VARS = {
  scrapeCreatorsApiKey: "SCRAPECREATORS_API_KEY",
  voyageApiKey: "VOYAGE_API_KEY",
} as const;

export const PARTNER_CONTENT_SEARCH_MODELS = {
  embedding: {
    provider: "voyage",
    model: "voyage-4",
    dimensions: 1024,
    outputDtype: "float",
  },
  reranker: {
    provider: "voyage",
    model: "rerank-2.5",
  },
} as const;

export const PARTNER_CONTENT_SEARCH_LIMITS = {
  recencyWindowMonths: 12,
  contentItemsPerPartnerPlatform: 50,
  lowTranscriptCoverageThreshold: 0.3,
  maxTranscriptBytesInPlanetscale: 500_000,
  chunkMinTokens: 400,
  chunkMaxTokens: 800,
  chunkOverlapTokens: 80,
  chunkCandidateCount: 200,
  rerankerCandidateCount: 150,
  partnerScorePoolSize: 3,
} as const;

export const PARTNER_CONTENT_SEARCH_FUSION_WEIGHTS = {
  semantic: 0.6,
  existingPartnerRank: 0.4,
} as const;
