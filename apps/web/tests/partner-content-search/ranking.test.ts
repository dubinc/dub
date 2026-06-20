import {
  createContentMatchEvidence,
  deriveTopicFit,
  getEntityCreatorTextBoost,
  getEvidenceMatchScore,
  getEvidenceTopicScore,
  getPartnerContentSearchQuerySignals,
} from "@/lib/partner-content-search/ranking";
import { describe, expect, test, vi } from "vitest";

// Mock server-only module (ranking.ts imports search-utils.ts -> voyage.ts).
vi.mock("server-only", () => ({}));

describe("partner content ranking", () => {
  test("weights creator-entered video text below transcript evidence", () => {
    const creatorTextOnlyVideo = createContentMatchEvidence({
      contentType: "video",
      transcriptScore: null,
      creatorTextScore: 0.8,
    });
    const transcriptVideo = createContentMatchEvidence({
      contentType: "video",
      transcriptScore: 0.8,
      creatorTextScore: null,
    });
    const creatorTextOnlyPhoto = createContentMatchEvidence({
      contentType: "photo",
      transcriptScore: null,
      creatorTextScore: 0.8,
    });

    expect(creatorTextOnlyVideo.weight).toBe(0.4);
    expect(getEvidenceMatchScore(creatorTextOnlyVideo)).toBe(0.4);
    expect(getEvidenceMatchScore(transcriptVideo)).toBe(1);
    expect(getEvidenceMatchScore(creatorTextOnlyPhoto)).toBe(1);
    expect(getEvidenceTopicScore(creatorTextOnlyVideo)).toBe(0.4);
    expect(getEvidenceTopicScore(transcriptVideo)).toBe(1);
  });

  test("lets exact entity captions override the default creator text video discount", () => {
    const evidence = createContentMatchEvidence({
      contentType: "video",
      transcriptScore: null,
      creatorTextScore: 0.95,
      creatorTextWeightOverride: 0.95,
    });

    expect(evidence.creatorTextWeight).toBe(0.95);
    expect(evidence.weight).toBe(0.95);
    expect(getEvidenceMatchScore(evidence)).toBe(0.95);
    expect(getEvidenceTopicScore(evidence)).toBe(0.95);
  });

  test("only boosts exact creator text for entity-style queries", () => {
    const entityQuery = getPartnerContentSearchQuerySignals("Framer");
    const semanticQuery =
      getPartnerContentSearchQuerySignals("fitness influencer");

    expect(entityQuery.intent).toBe("entity");
    expect(semanticQuery.intent).toBe("semantic");

    expect(
      getEntityCreatorTextBoost({
        platformType: "tiktok",
        contentType: "video",
        transcriptFetchStatus: "pending",
        titleHasExactQueryMention: false,
        descriptionHasExactQueryMention: true,
        chunkHasExactQueryMention: true,
        transcriptScore: null,
        queryIntent: entityQuery.intent,
      }),
    ).toEqual({
      score: 0.95,
      weight: 0.95,
    });
    expect(
      getEntityCreatorTextBoost({
        platformType: "tiktok",
        contentType: "video",
        transcriptFetchStatus: "pending",
        titleHasExactQueryMention: false,
        descriptionHasExactQueryMention: true,
        chunkHasExactQueryMention: true,
        transcriptScore: null,
        queryIntent: semanticQuery.intent,
      }),
    ).toBeNull();
  });

  test("does not let high creator text override weaker transcript evidence at full weight", () => {
    const evidence = createContentMatchEvidence({
      contentType: "video",
      transcriptScore: 0.6,
      creatorTextScore: 0.9,
    });

    expect(evidence.primarySource).toBe("transcript");
    expect(getEvidenceMatchScore(evidence)).toBeCloseTo(0.783, 3);
    expect(getEvidenceTopicScore(evidence)).toBe(1);
  });

  test("topic fit rewards stronger evidence for the same matched coverage", () => {
    const weak = deriveTopicFit({
      matchedContentCount: 20,
      weightedMatchedContentCount: 20,
      weightedMatchedContentScore: 7.433,
      recentContentCount: 20,
    });
    const strong = deriveTopicFit({
      matchedContentCount: 20,
      weightedMatchedContentCount: 20,
      weightedMatchedContentScore: 20,
      recentContentCount: 20,
    });

    expect(strong.topicFit).toBeGreaterThan(weak.topicFit);
  });

  test("topic fit discounts tiny samples with the same coverage and strength", () => {
    const smallSample = deriveTopicFit({
      matchedContentCount: 3,
      weightedMatchedContentCount: 3,
      weightedMatchedContentScore: 3,
      recentContentCount: 3,
    });
    const largeSample = deriveTopicFit({
      matchedContentCount: 30,
      weightedMatchedContentCount: 30,
      weightedMatchedContentScore: 30,
      recentContentCount: 30,
    });

    expect(largeSample.topicFit).toBeGreaterThan(smallSample.topicFit);
  });

  test("topic fit lets broad strong coverage reach the high 90s", () => {
    const topicFit = deriveTopicFit({
      matchedContentCount: 28,
      weightedMatchedContentCount: 28,
      weightedMatchedContentScore: 28,
      recentContentCount: 28,
    });

    expect(topicFit.topicFit).toBeGreaterThanOrEqual(98);
  });
});
