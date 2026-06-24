// Manually-created PlanetScale VECTOR index on PartnerContentChunk.embedding and its
// distance metric. Keep in sync with the schema @@index(map:) and the FORCE INDEX /
// DISTANCE() calls — vector-index-sync.test.ts guards the drift.
export const PARTNER_CONTENT_CHUNK_VECTOR_INDEX =
  "partner_content_chunk_embedding_cosine_idx";

export const PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE = "cosine";

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
  chunkMinTokens: 400,
  chunkMaxTokens: 800,
  chunkOverlapTokens: 80, // Cross-chunk context.
  recentContentMaxPerPartner: 200, // Detail topic-fit eval cap.
  vectorSearchChunkPoolSize: 600, // Raw ANN pool.
  rerankerCandidateCount: 150, // Query/rerank cap.
  rerankerDocumentCharSafetyLimit: 20_000, // Bug guard.
} as const;

export const PARTNER_CONTENT_SEARCH_FUSION_WEIGHTS = {
  semantic: 0.6,
  existingPartnerRank: 0.4,
} as const;

// Tuning for the aggregate "Topic Fit" card score. Reranker relevance gates which
// recent posts count as on-topic; the score is then coverage-based.
export const PARTNER_CONTENT_SEARCH_TOPIC_FIT = {
  rerankMatchThreshold: 0.4,
  // topicFit = 100 * coverage^exponent (concave lift, so mid-coverage isn't punished).
  coverageCurveExponent: 0.5,
  strongMatchScore: 0.7,
  minimumMatchedEvidenceStrength: 0.35,
  // depthConfidence = 1 - exp(-weightedMatchedContentScore / this); lower saturates faster.
  depthSaturationScore: 4,
  // Credit kept when on-topic posts are diluted (0 = pure ratio, 1 = ignore dilution).
  dilutionForgiveness: 0.25,
  creatorTextOnlyVideoWeight: 0.4,
  bandThresholds: {
    consistent: 0.5,
    frequent: 0.25,
  },
} as const;

// Tuning for the detail-pane "Top content" list only — never feeds Topic Fit, the
// coverage summary, or partner ordering.
export const PARTNER_CONTENT_SEARCH_TOP_CONTENT = {
  topContentCount: 5,
  relevanceWeight: 0.7,
  engagementWeight: 0.3,
  // log10-view spread of the logistic mapping views to a [0,1] score vs. the median.
  engagementLogSpread: 0.5,
} as const;

export type PartnerContentTopicFitBand =
  | "consistent"
  | "frequent"
  | "occasional"
  | "one-off"
  | "none";

export const PARTNER_CONTENT_SEARCH_PARTNER_LIMIT = 50;
export const PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER = 2;
export const PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER = 50;
export const PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER = 40;
export const PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS = 10_000;
export const PARTNER_CONTENT_SEARCH_RERANK_TIMEOUT_MS = 4_000;
