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
    id: "voyage:voyage-4:1024:float",
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

// Max number of partners returned by the network content search (and the cap the
// route enforces). Shared so the client request and the route stay in sync.
export const PARTNER_CONTENT_SEARCH_PARTNER_LIMIT = 50;

// Default number of chunks surfaced per partner in the network content search.
export const PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER = 2;

// Timeout for the query-embedding call on user-facing search routes. Fails fast
// through the normal error path instead of hanging until the function's
// maxDuration (30s) is hit.
export const PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS = 10_000;
