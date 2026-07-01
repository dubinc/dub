import type { PartnerContentTopicFitBand } from "./constants";
import { PARTNER_CONTENT_SEARCH_TOPIC_FIT } from "./constants";
import {
  effectiveRowScore,
  toScore,
  type PartnerContentSearchRow,
} from "./search-utils";

export type PartnerContentMatchSource = "transcript" | "creatorText";

// Best score per content item, split by evidence source (get/set helpers below).
export type SourceScoreByContentItemId = Map<
  string,
  Map<PartnerContentMatchSource, number>
>;

export type PartnerContentMatchEvidence = {
  primarySource: PartnerContentMatchSource | null;
  sources: PartnerContentMatchSource[];
  transcriptScore: number | null;
  creatorTextScore: number | null;
  creatorTextWeight: number;
  weight: number;
};

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

  // Coverage = depthConfidence (saturating on-topic evidence, so one post can't read
  // as strong) modulated by purity (strength-weighted on-topic share). depthConfidence
  // gates the score; purity only moves it between dilutionForgiveness and 1, so a deep
  // on-topic body still scores well when mixed with off-topic posts.
  const {
    coverageCurveExponent,
    bandThresholds,
    depthSaturationScore,
    dilutionForgiveness,
  } = PARTNER_CONTENT_SEARCH_TOPIC_FIT;
  const purity = Math.min(1, weightedMatchedContentScore / recentContentCount);
  const depthConfidence =
    1 - Math.exp(-weightedMatchedContentScore / depthSaturationScore);
  const coverage = Math.min(
    1,
    Math.max(
      0,
      depthConfidence *
        (dilutionForgiveness + (1 - dilutionForgiveness) * purity),
    ),
  );
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

// Ranking-domain alias of effectiveRowScore (single implementation, no drift).
export const getRowRelevanceScore = effectiveRowScore;

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

// Final query-mode partner ordering: topic fit, then match-strength tiebreakers,
// then row score and reach. Generic so the route passes its candidate objects.
export function sortPartnersByTopicFit<
  T extends {
    score: number;
    matchSummary: {
      topicFit: number;
      weightedMatchedContentScore: number;
      weightedMatchedContentCount: number;
      transcriptMatchedContentCount: number;
      matchedContentCount: number;
      followers: number | null;
    } | null;
  },
>(partners: T[]) {
  return [...partners].sort((a, b) => {
    const aSummary = a.matchSummary;
    const bSummary = b.matchSummary;

    return (
      (bSummary?.topicFit ?? 0) - (aSummary?.topicFit ?? 0) ||
      (bSummary?.weightedMatchedContentScore ?? 0) -
        (aSummary?.weightedMatchedContentScore ?? 0) ||
      (bSummary?.weightedMatchedContentCount ?? 0) -
        (aSummary?.weightedMatchedContentCount ?? 0) ||
      (bSummary?.transcriptMatchedContentCount ?? 0) -
        (aSummary?.transcriptMatchedContentCount ?? 0) ||
      (bSummary?.matchedContentCount ?? 0) -
        (aSummary?.matchedContentCount ?? 0) ||
      b.score - a.score ||
      (bSummary?.followers ?? 0) - (aSummary?.followers ?? 0)
    );
  });
}

export function getEvidenceSource(source: string): PartnerContentMatchSource {
  return source === "transcript" ? "transcript" : "creatorText";
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

export function createContentMatchEvidence({
  contentType,
  transcriptScore,
  creatorTextScore,
}: {
  contentType: string;
  transcriptScore: number | null;
  creatorTextScore: number | null;
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
  const creatorTextWeight = getCreatorTextWeight(contentType);
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
      // Transcript match already passed the relevance gate → full credit; creator
      // text uses its context-aware weight.
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
