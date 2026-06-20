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
  // Safety cap on recent posts per partner feeding the topic-fit window. The
  // window itself is time-based (recencyWindowMonths); this just bounds the
  // per-partner item set so the exact per-item scoring query stays cheap for
  // extremely prolific creators.
  recentContentMaxPerPartner: 200,
  // Pre-dedup ANN over-fetch for retrieval. We pull this many raw chunks via the
  // vector index (flat `ORDER BY DISTANCE ... LIMIT`, which stays index-friendly),
  // then collapse to the best chunk per content item in app code. Larger = better
  // video/partner diversity when one high-volume creator dominates a query;
  // bounded so the ANN fetch stays fast.
  vectorSearchChunkPoolSize: 1000,
  rerankerCandidateCount: 150,
  // Cap each document sent to the reranker. Chunks are <=800 tokens; trimming the
  // tail keeps the rerank payload (and thus latency) down with little quality loss.
  rerankerMaxDocChars: 2_000,
  partnerScorePoolSize: 3,
} as const;

export const PARTNER_CONTENT_SEARCH_FUSION_WEIGHTS = {
  semantic: 0.6,
  existingPartnerRank: 0.4,
} as const;

// "Topic fit" is the aggregate card score. Reranker relevance gates which recent
// posts count as on-topic, then the displayed score is based on coverage.
// `bandThresholds` are coverage cutoffs that drive the qualitative label + color.
export const PARTNER_CONTENT_SEARCH_TOPIC_FIT = {
  // A recent post counts as "on topic" when its reranker relevance clears this.
  // Reranker scores for a broad keyword query top out well below 1 (~0.6-0.8 for
  // a clearly on-topic post), so magnitude gates membership rather than scaling
  // the score. Tune against a known off-topic creator to set the floor.
  rerankMatchThreshold: 0.4,
  // Topic fit = 100 * adjustedCoverage^exponent, where adjusted coverage is
  // strength-weighted evidence coverage after the small-sample confidence
  // adjustment. The <1 exponent is a concave lift so mid-coverage creators don't
  // read punishingly low.
  coverageCurveExponent: 0.5,
  // A matched source at or above this score gets full per-source topic credit.
  // Scores below this but above the match threshold still count, but only
  // partially. This prevents reranker magnitude from capping creators who are
  // clearly and consistently on-topic.
  strongMatchScore: 0.7,
  // A just-over-threshold source gets this much per-source topic credit.
  minimumMatchedEvidenceStrength: 0.35,
  // Small recent-content samples should not rank as confidently as larger
  // bodies of work with the same match ratio. Keep this light so a creator with
  // 25-50 consistently on-topic posts can still reach the high 90s.
  sampleConfidenceContentCount: 2,
  // Creator-entered text on videos/reels (titles, descriptions, captions) is
  // useful evidence, but weaker than transcript evidence because it can contain
  // SEO copy, link blocks, or repeated channel boilerplate. Static posts get full
  // credit because creator text is the main searchable content there.
  creatorTextOnlyVideoWeight: 0.4,
  bandThresholds: {
    consistent: 0.5,
    frequent: 0.25,
  },
} as const;

// Ranking for the detail-pane "Top content" section: a relevance-led blend of
// how on-topic a matched post is with how well it performed (views), normalized
// per creator and robust to a single viral outlier. This only orders that list;
// it never feeds Topic Fit, the bars, or partner ordering.
export const PARTNER_CONTENT_SEARCH_TOP_CONTENT = {
  // How many matched posts the "Top content" section highlights.
  topContentCount: 5,
  // Blend weights. Relevance leads because this is a topic search; views break
  // ties and surface the strongest proof points without overriding relevance.
  relevanceWeight: 0.7,
  engagementWeight: 0.3,
  // Spread (in log10 view units) of the logistic that maps a post's views to a
  // [0,1] engagement score relative to the creator's median. ~0.5 means roughly
  // a 3x swing in views moves the score one logistic unit. Median post -> ~0.5,
  // a viral outlier saturates toward 1 (never dominates), a below-median post
  // lands near 0 but is never punished into negative territory.
  engagementLogSpread: 0.5,
} as const;

export type PartnerContentTopicFitBand =
  | "consistent"
  | "frequent"
  | "occasional"
  | "one-off"
  | "none";

// Max number of partners returned by the network content search (and the cap the
// route enforces). Shared so the client request and the route stay in sync.
export const PARTNER_CONTENT_SEARCH_PARTNER_LIMIT = 50;

// Default number of chunks surfaced per partner in the network content search.
export const PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER = 2;

// Max number of content-level matches surfaced for one partner. This lines up
// with the card's "last 28 posts" content match visualization.
export const PARTNER_CONTENT_SEARCH_MAX_CHUNKS_PER_PARTNER = 28;

// Timeout for the query-embedding call on user-facing search routes. Fails fast
// through the normal error path instead of hanging until the function's
// maxDuration (30s) is hit.
export const PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS = 10_000;

// Timeout for the second-stage reranker call. Unlike the embedding timeout this
// fails *soft*: on timeout the search falls back to cosine ordering so a slow
// rerank never breaks results, it just doesn't improve them.
export const PARTNER_CONTENT_SEARCH_RERANK_TIMEOUT_MS = 4_000;
