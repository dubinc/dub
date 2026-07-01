import {
  createContentMatchEvidence,
  getEvidenceMatchScore,
  getEvidenceSource,
  getEvidenceTopicScore,
  getMatchedSourceScore,
  getSourceScore,
  type PartnerContentMatchEvidence,
  type SourceScoreByContentItemId,
} from "./ranking";
import { toScore, type PartnerContentSearchRow } from "./search-utils";
import type { PartnerRecentContentRow } from "./match-summary-queries";

export type PartnerContentItemBestMatch = {
  transcriptScore: number | null;
  creatorTextScore: number | null;
};

export type PartnerContentMatch = {
  partnerContentItemId: string;
  platform: string;
  publishedAt: string | null;
  viewCount: number | null;
  matched: boolean;
  matchScore: number | null;
  matchEvidence: PartnerContentMatchEvidence;
};

export type QueryContentMatchContext = {
  cutoffDistance?: number | null;
  recentItemSourceBestDistance: SourceScoreByContentItemId;
  rerankByItemSource: SourceScoreByContentItemId;
};

export type ListContentMatchContext = {
  bestMatchByContentItemId: Map<string, PartnerContentItemBestMatch>;
};

export type ContentMatchContext =
  | QueryContentMatchContext
  | ListContentMatchContext;

export function getBestMatchByContentItemId(rows: PartnerContentSearchRow[]) {
  const bestMatchByContentItemId = new Map<
    string,
    PartnerContentItemBestMatch
  >();

  for (const row of rows) {
    const score = row.rerankScore ?? toScore(Number(row.distance));
    const evidenceSource = getEvidenceSource(row.chunkSource);
    const existing = bestMatchByContentItemId.get(row.partnerContentItemId);
    const next = existing ?? {
      transcriptScore: null,
      creatorTextScore: null,
    };

    if (evidenceSource === "transcript") {
      next.transcriptScore =
        next.transcriptScore == null
          ? score
          : Math.max(next.transcriptScore, score);
    } else {
      next.creatorTextScore =
        next.creatorTextScore == null
          ? score
          : Math.max(next.creatorTextScore, score);
    }

    bestMatchByContentItemId.set(row.partnerContentItemId, next);
  }

  return bestMatchByContentItemId;
}

export function getQueryContentMatch({
  row,
  context,
}: {
  row: PartnerRecentContentRow;
  context: QueryContentMatchContext;
}) {
  // On-topic gate: rerank score when present, else cosine cutoff (no lexical boost).
  const transcriptScore = getMatchedSourceScore({
    rerankScore: getSourceScore(
      context.rerankByItemSource,
      row.partnerContentItemId,
      "transcript",
    ),
    bestDistance: getSourceScore(
      context.recentItemSourceBestDistance,
      row.partnerContentItemId,
      "transcript",
    ),
    cutoffDistance: context.cutoffDistance,
  });
  const creatorTextScore = getMatchedSourceScore({
    rerankScore: getSourceScore(
      context.rerankByItemSource,
      row.partnerContentItemId,
      "creatorText",
    ),
    bestDistance: getSourceScore(
      context.recentItemSourceBestDistance,
      row.partnerContentItemId,
      "creatorText",
    ),
    cutoffDistance: context.cutoffDistance,
  });

  const matchEvidence = createContentMatchEvidence({
    contentType: row.contentType,
    transcriptScore,
    creatorTextScore,
  });

  return {
    matchEvidence,
    matchScore: getEvidenceMatchScore(matchEvidence),
  };
}

export function getListContentMatch({
  row,
  context,
}: {
  row: PartnerRecentContentRow;
  context: ListContentMatchContext;
}) {
  const match = context.bestMatchByContentItemId.get(row.partnerContentItemId);
  const matchEvidence = createContentMatchEvidence({
    contentType: row.contentType,
    transcriptScore: match?.transcriptScore ?? null,
    creatorTextScore: match?.creatorTextScore ?? null,
  });

  return {
    matchEvidence,
    matchScore: getEvidenceMatchScore(matchEvidence),
  };
}

export function toContentMatch({
  row,
  context,
}: {
  row: PartnerRecentContentRow;
  context: ContentMatchContext;
}): PartnerContentMatch {
  const { matchEvidence, matchScore } =
    "bestMatchByContentItemId" in context
      ? getListContentMatch({ row, context })
      : getQueryContentMatch({ row, context });
  const matched = matchEvidence.sources.length > 0;

  return {
    partnerContentItemId: row.partnerContentItemId,
    platform: row.platformType,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    viewCount: row.viewCount != null ? Number(row.viewCount) : null,
    matched,
    matchScore,
    matchEvidence,
  };
}

// Strong vs partial split for the coverage bar (calibrated score ≥ 0.7).
const STRONG_MATCH_DISPLAY_THRESHOLD = 0.7;

export function getContentMatchStats(contentMatches: PartnerContentMatch[]) {
  const matchedContent = contentMatches.filter((match) => match.matched);
  const matchedContentCount = matchedContent.length;
  const strongMatchedContentCount = matchedContent.filter(
    (match) => (match.matchScore ?? 0) >= STRONG_MATCH_DISPLAY_THRESHOLD,
  ).length;
  const partialMatchedContentCount =
    matchedContentCount - strongMatchedContentCount;
  const transcriptMatchedContentCount = contentMatches.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("transcript"),
  ).length;
  const creatorTextMatchedContentCount = contentMatches.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("creatorText"),
  ).length;
  const creatorTextOnlyContentCount = contentMatches.filter(
    ({ matchEvidence }) =>
      matchEvidence.primarySource === "creatorText" &&
      matchEvidence.sources.length === 1,
  ).length;
  const weightedMatchedContentCount = Number(
    contentMatches
      .reduce((total, match) => total + match.matchEvidence.weight, 0)
      .toFixed(3),
  );
  const weightedMatchedContentScore = Number(
    contentMatches
      .reduce(
        (total, match) =>
          total + (getEvidenceTopicScore(match.matchEvidence) ?? 0),
        0,
      )
      .toFixed(3),
  );

  return {
    matchedContent,
    matchedContentCount,
    strongMatchedContentCount,
    partialMatchedContentCount,
    transcriptMatchedContentCount,
    creatorTextMatchedContentCount,
    creatorTextOnlyContentCount,
    weightedMatchedContentCount,
    weightedMatchedContentScore,
  };
}
