import type { PartnerContentTopicFitBand } from "./constants";
import { PARTNER_CONTENT_SEARCH_TOPIC_FIT } from "./constants";
import { toScore, type PartnerContentSearchRow } from "./search-utils";

export type PartnerContentMatchSource = "transcript" | "creatorText";

export type PartnerContentSearchQueryIntent = "entity" | "semantic";

export type PartnerContentSearchQuerySignals = {
  normalizedQuery: string;
  intent: PartnerContentSearchQueryIntent;
};

export type PartnerContentMatchEvidence = {
  primarySource: PartnerContentMatchSource | null;
  sources: PartnerContentMatchSource[];
  transcriptScore: number | null;
  creatorTextScore: number | null;
  creatorTextWeight: number;
  weight: number;
};

const ENTITY_EXACT_MATCH_SCORE = 0.95;

const SEMANTIC_QUERY_TERMS = new Set([
  "athlete",
  "athletes",
  "beauty",
  "blogger",
  "bloggers",
  "coach",
  "coaches",
  "cooking",
  "creator",
  "creators",
  "dad",
  "fashion",
  "finance",
  "fitness",
  "food",
  "gamer",
  "gamers",
  "gaming",
  "health",
  "influencer",
  "influencers",
  "lifestyle",
  "mom",
  "music",
  "nutrition",
  "outdoor",
  "outdoors",
  "parenting",
  "personal",
  "photography",
  "podcast",
  "podcaster",
  "recipe",
  "recipes",
  "running",
  "skincare",
  "sports",
  "travel",
  "wellness",
  "yoga",
]);

export function deriveTopicFit({
  matchedContentCount,
  weightedMatchedContentCount,
  weightedMatchedContentScore,
  recentContentCount,
}: {
  matchedContentCount: number;
  weightedMatchedContentCount: number;
  weightedMatchedContentScore: number;
  recentContentCount: number;
}): { topicFit: number; band: PartnerContentTopicFitBand } {
  if (matchedContentCount === 0 || recentContentCount === 0) {
    return { topicFit: 0, band: "none" };
  }

  // Topic fit is driven by strength-adjusted weighted coverage. Transcript
  // evidence and creator text on static posts get full credit; creator text on
  // videos is weighted by source context so repeated descriptions stay weaker
  // than transcript evidence while exact captions can still count. Small samples
  // are discounted so 3/3 weak matches do not read as equivalent to 30/30 strong
  // matches.
  const rawCoverage = weightedMatchedContentScore / recentContentCount;
  const {
    coverageCurveExponent,
    bandThresholds,
    sampleConfidenceContentCount,
  } = PARTNER_CONTENT_SEARCH_TOPIC_FIT;
  const sampleConfidence = Math.sqrt(
    recentContentCount / (recentContentCount + sampleConfidenceContentCount),
  );
  const coverage = Math.min(1, Math.max(0, rawCoverage * sampleConfidence));
  const topicFit = Math.round(100 * Math.pow(coverage, coverageCurveExponent));

  const band: PartnerContentTopicFitBand =
    coverage >= bandThresholds.consistent
      ? "consistent"
      : coverage >= bandThresholds.frequent
        ? "frequent"
        : matchedContentCount === 1
          ? "one-off"
          : "occasional";

  return { topicFit, band };
}

export function getRowRelevanceScore(row: PartnerContentSearchRow) {
  return row.rerankScore ?? toScore(Number(row.distance));
}

export function getSourceAwareRowScore(row: PartnerContentSearchRow) {
  const score = getRowRelevanceScore(row);
  const source = getEvidenceSource(row.chunkSource);

  if (source === "transcript") return score;
  return Number((score * getCreatorTextWeight(row.contentType)).toFixed(6));
}

export function sortRowsByRelevanceScore(rows: PartnerContentSearchRow[]) {
  return [...rows].sort(
    (a, b) => getRowRelevanceScore(b) - getRowRelevanceScore(a),
  );
}

export function sortRowsBySourceAwareScore(rows: PartnerContentSearchRow[]) {
  return [...rows].sort(
    (a, b) => getSourceAwareRowScore(b) - getSourceAwareRowScore(a),
  );
}

export function getEvidenceSource(source: string): PartnerContentMatchSource {
  return source === "transcript" ? "transcript" : "creatorText";
}

export function getPartnerContentSearchQuerySignals(
  query?: string | null,
): PartnerContentSearchQuerySignals {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const intent: PartnerContentSearchQueryIntent =
    normalizedQuery.length === 0 ||
    terms.some((term) => SEMANTIC_QUERY_TERMS.has(term)) ||
    terms.length > 3
      ? "semantic"
      : "entity";

  return {
    normalizedQuery,
    intent,
  };
}

export function normalizeSearchText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function hasExactQueryMention(
  value: string | null | undefined,
  querySignals: PartnerContentSearchQuerySignals,
) {
  return (
    querySignals.normalizedQuery.length > 0 &&
    normalizeSearchText(value).includes(querySignals.normalizedQuery)
  );
}

export function getEntityTranscriptScore({
  currentScore,
  hasExactQueryMention,
  queryIntent,
}: {
  currentScore: number | null;
  hasExactQueryMention: boolean;
  queryIntent: PartnerContentSearchQueryIntent;
}) {
  if (queryIntent !== "entity" || !hasExactQueryMention) return currentScore;
  return maxNullableScore(currentScore, ENTITY_EXACT_MATCH_SCORE);
}

export function getEntityCreatorTextBoost({
  platformType,
  contentType,
  transcriptFetchStatus,
  titleHasExactQueryMention,
  descriptionHasExactQueryMention,
  chunkHasExactQueryMention,
  transcriptScore,
  queryIntent,
}: {
  platformType: string;
  contentType: string;
  transcriptFetchStatus?: string | null;
  titleHasExactQueryMention: boolean;
  descriptionHasExactQueryMention: boolean;
  chunkHasExactQueryMention: boolean;
  transcriptScore: number | null;
  queryIntent: PartnerContentSearchQueryIntent;
}): { score: number; weight: number } | null {
  if (
    queryIntent !== "entity" ||
    (!titleHasExactQueryMention &&
      !descriptionHasExactQueryMention &&
      !chunkHasExactQueryMention)
  ) {
    return null;
  }

  if (isStaticContentType(contentType)) {
    return {
      score: ENTITY_EXACT_MATCH_SCORE,
      weight: 1,
    };
  }

  const platform = platformType.toLowerCase();
  const transcriptUnavailable =
    transcriptScore == null ||
    isUnavailableTranscriptStatus(transcriptFetchStatus);

  if (platform === "tiktok" || platform === "instagram") {
    return transcriptUnavailable
      ? {
          score: ENTITY_EXACT_MATCH_SCORE,
          weight: 0.95,
        }
      : {
          score: 0.9,
          weight: 0.85,
        };
  }

  if (platform === "youtube") {
    return titleHasExactQueryMention
      ? {
          score: 0.9,
          weight: 0.85,
        }
      : {
          score: 0.65,
          weight: 0.35,
        };
  }

  return titleHasExactQueryMention
    ? {
        score: 0.9,
        weight: 0.85,
      }
    : {
        score: 0.75,
        weight: 0.6,
      };
}

export function maxNullableScore(...scores: Array<number | null | undefined>) {
  const numericScores = scores.filter(
    (score): score is number => typeof score === "number",
  );

  return numericScores.length ? Math.max(...numericScores) : null;
}

function getCreatorTextWeight(contentType: string) {
  return isVideoLikeContentType(contentType)
    ? PARTNER_CONTENT_SEARCH_TOPIC_FIT.creatorTextOnlyVideoWeight
    : 1;
}

function isVideoLikeContentType(contentType: string) {
  return ["video", "reel", "short", "shorts"].includes(
    contentType.toLowerCase(),
  );
}

function isStaticContentType(contentType: string) {
  return ["carousel", "image", "photo", "post"].includes(
    contentType.toLowerCase(),
  );
}

function isUnavailableTranscriptStatus(status?: string | null) {
  return (
    status === "pending" || status === "notAvailable" || status === "error"
  );
}

export function createContentMatchEvidence({
  contentType,
  transcriptScore,
  creatorTextScore,
  creatorTextWeightOverride,
}: {
  contentType: string;
  transcriptScore: number | null;
  creatorTextScore: number | null;
  creatorTextWeightOverride?: number | null;
}): PartnerContentMatchEvidence {
  const sources: PartnerContentMatchSource[] = [];
  if (transcriptScore != null) sources.push("transcript");
  if (creatorTextScore != null) sources.push("creatorText");

  const primarySource: PartnerContentMatchSource | null =
    transcriptScore != null
      ? "transcript"
      : creatorTextScore != null
        ? "creatorText"
        : null;
  const creatorTextWeight =
    creatorTextWeightOverride ?? getCreatorTextWeight(contentType);
  const weight =
    primarySource === null
      ? 0
      : primarySource === "transcript"
        ? 1
        : creatorTextWeight;

  return {
    primarySource,
    sources,
    transcriptScore,
    creatorTextScore,
    creatorTextWeight,
    weight,
  };
}

export function getEvidenceMatchScore(evidence: PartnerContentMatchEvidence) {
  if (evidence.sources.length === 0) return null;

  return Number(
    Math.max(
      getEvidenceStrength(evidence.transcriptScore),
      getEvidenceStrength(evidence.creatorTextScore) *
        evidence.creatorTextWeight,
    ).toFixed(6),
  );
}

export function getEvidenceTopicScore(evidence: PartnerContentMatchEvidence) {
  if (evidence.sources.length === 0) return null;

  return Number(
    Math.max(
      // A transcript/source-content match has already passed the relevance gate,
      // so it gets full topic credit. Creator text uses the context-aware weight
      // chosen when the evidence was created.
      evidence.transcriptScore != null ? 1 : 0,
      getEvidenceStrength(evidence.creatorTextScore) *
        evidence.creatorTextWeight,
    ).toFixed(6),
  );
}

function getEvidenceStrength(score: number | null) {
  if (score == null) return 0;

  const {
    rerankMatchThreshold,
    strongMatchScore,
    minimumMatchedEvidenceStrength,
  } = PARTNER_CONTENT_SEARCH_TOPIC_FIT;

  if (score >= strongMatchScore) return 1;
  if (score <= rerankMatchThreshold) return minimumMatchedEvidenceStrength;

  const progress =
    (score - rerankMatchThreshold) / (strongMatchScore - rerankMatchThreshold);

  return (
    minimumMatchedEvidenceStrength +
    progress * (1 - minimumMatchedEvidenceStrength)
  );
}

export function getMatchedSourceScore({
  rerankScore,
  bestDistance,
  cutoffDistance,
}: {
  rerankScore?: number;
  bestDistance?: number;
  cutoffDistance?: number | null;
}) {
  if (rerankScore !== undefined) {
    return rerankScore >= PARTNER_CONTENT_SEARCH_TOPIC_FIT.rerankMatchThreshold
      ? rerankScore
      : null;
  }

  return bestDistance !== undefined &&
    cutoffDistance != null &&
    bestDistance <= cutoffDistance
    ? toScore(bestDistance)
    : null;
}

export function getSourceScore(
  sourceScoresByItemId: Map<string, Map<PartnerContentMatchSource, number>>,
  itemId: string,
  source: PartnerContentMatchSource,
) {
  return sourceScoresByItemId.get(itemId)?.get(source);
}

export function setSourceScore(
  sourceScoresByItemId: Map<string, Map<PartnerContentMatchSource, number>>,
  itemId: string,
  source: PartnerContentMatchSource,
  score: number,
) {
  const itemScores = sourceScoresByItemId.get(itemId) ?? new Map();
  const current = itemScores.get(source);

  if (current === undefined || score > current) {
    itemScores.set(source, score);
    sourceScoresByItemId.set(itemId, itemScores);
  }
}

export function setSourceDistance(
  sourceDistancesByItemId: Map<string, Map<PartnerContentMatchSource, number>>,
  itemId: string,
  source: PartnerContentMatchSource,
  distance: number,
) {
  const itemDistances = sourceDistancesByItemId.get(itemId) ?? new Map();
  const current = itemDistances.get(source);

  if (current === undefined || distance < current) {
    itemDistances.set(source, distance);
    sourceDistancesByItemId.set(itemId, itemDistances);
  }
}
