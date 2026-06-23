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
import type { PartnerRecentContentBarRow } from "./match-summary-queries";

export type PartnerContentItemBestMatch = {
  transcriptScore: number | null;
  creatorTextScore: number | null;
};

export type PartnerContentMatchBar = {
  partnerContentItemId: string;
  platform: string;
  platformContentId: string;
  title: string | null;
  url: string | null;
  durationMs: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  saveCount: number | null;
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
    // Use the effective score (rerank when present) so the content-match bars
    // stay consistent with the reranked partner ordering.
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
  row: PartnerRecentContentBarRow;
  context: QueryContentMatchContext;
}) {
  // On-topic gate: prefer the reranker's calibrated relevance; fall back to the
  // cosine cutoff only for items the reranker didn't score. Both sources rely
  // solely on embedding retrieval + reranking — no lexical title/description boost.
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
  row: PartnerRecentContentBarRow;
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

export function toContentMatchBar({
  row,
  context,
}: {
  row: PartnerRecentContentBarRow;
  context: ContentMatchContext;
}): PartnerContentMatchBar {
  const { matchEvidence, matchScore } =
    "bestMatchByContentItemId" in context
      ? getListContentMatch({ row, context })
      : getQueryContentMatch({ row, context });
  const matched = matchEvidence.sources.length > 0;

  return {
    partnerContentItemId: row.partnerContentItemId,
    platform: row.platformType,
    platformContentId: row.platformContentId,
    title: row.contentTitle,
    url: row.contentUrl,
    durationMs:
      row.contentDurationMs != null ? Number(row.contentDurationMs) : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    viewCount: row.viewCount != null ? Number(row.viewCount) : null,
    likeCount: row.likeCount != null ? Number(row.likeCount) : null,
    commentCount: row.commentCount != null ? Number(row.commentCount) : null,
    shareCount: row.shareCount != null ? Number(row.shareCount) : null,
    saveCount: row.saveCount != null ? Number(row.saveCount) : null,
    matched,
    matchScore,
    matchEvidence,
  };
}

export function getContentBarMatchStats(contentBars: PartnerContentMatchBar[]) {
  const matchedBars = contentBars.filter((bar) => bar.matched);
  const matchedContentCount = matchedBars.length;
  const transcriptMatchedContentCount = contentBars.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("transcript"),
  ).length;
  const creatorTextMatchedContentCount = contentBars.filter(
    ({ matchEvidence }) => matchEvidence.sources.includes("creatorText"),
  ).length;
  const creatorTextOnlyContentCount = contentBars.filter(
    ({ matchEvidence }) =>
      matchEvidence.primarySource === "creatorText" &&
      matchEvidence.sources.length === 1,
  ).length;
  const weightedMatchedContentCount = Number(
    contentBars
      .reduce((total, bar) => total + bar.matchEvidence.weight, 0)
      .toFixed(3),
  );
  const weightedMatchedContentScore = Number(
    contentBars
      .reduce(
        (total, bar) => total + (getEvidenceTopicScore(bar.matchEvidence) ?? 0),
        0,
      )
      .toFixed(3),
  );

  return {
    matchedBars,
    matchedContentCount,
    transcriptMatchedContentCount,
    creatorTextMatchedContentCount,
    creatorTextOnlyContentCount,
    weightedMatchedContentCount,
    weightedMatchedContentScore,
  };
}
