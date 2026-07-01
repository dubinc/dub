import {
  createContentMatchEvidence,
  deriveTopicFit,
  getEvidenceMatchScore,
  getEvidenceTopicScore,
  getMatchedSourceScore,
} from "@/lib/partner-content-search/ranking";
import { PARTNER_CONTENT_SEARCH_TOPIC_FIT } from "@/lib/partner-content-search/constants";
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

  test("gates a recent post as matched only via reranker threshold or cutoff distance", () => {
    const { rerankMatchThreshold } = PARTNER_CONTENT_SEARCH_TOPIC_FIT;

    // Reranker score is authoritative when present: at/above the threshold matches,
    // below it does not — regardless of distance.
    expect(getMatchedSourceScore({ rerankScore: rerankMatchThreshold })).toBe(
      rerankMatchThreshold,
    );
    expect(
      getMatchedSourceScore({ rerankScore: rerankMatchThreshold - 0.01 }),
    ).toBeNull();

    // Without a reranker score, fall back to the cosine cutoff: within cutoff
    // matches (scored as 1 - distance), beyond it does not.
    expect(
      getMatchedSourceScore({ bestDistance: 0.3, cutoffDistance: 0.4 }),
    ).toBe(0.7);
    expect(
      getMatchedSourceScore({ bestDistance: 0.5, cutoffDistance: 0.4 }),
    ).toBeNull();

    // No retrieval evidence at all → no match (lexical title/description text
    // alone can no longer create or boost a match).
    expect(getMatchedSourceScore({})).toBeNull();
    expect(getMatchedSourceScore({ bestDistance: 0.3 })).toBeNull();
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

  test("topic fit demotes a thin one-off below a deep but diluted creator", () => {
    // One on-topic post, nothing else: topically "pure" but unproven.
    const oneOff = deriveTopicFit({
      matchedContentCount: 1,
      weightedMatchedContentCount: 1,
      weightedMatchedContentScore: 0.9,
      recentContentCount: 1,
    });
    // Many on-topic posts diluted by off-topic ones (the creator also posts
    // about other things). Lower purity, but a real body of on-topic work.
    const deepButDiluted = deriveTopicFit({
      matchedContentCount: 30,
      weightedMatchedContentCount: 30,
      weightedMatchedContentScore: 30,
      recentContentCount: 100,
    });

    expect(oneOff.band).toBe("one-off");
    expect(oneOff.topicFit).toBeLessThan(50);
    expect(deepButDiluted.topicFit).toBeGreaterThan(oneOff.topicFit);
  });

  test("topic fit rewards on-topic depth over a shallow diluted creator", () => {
    const deepButDiluted = deriveTopicFit({
      matchedContentCount: 30,
      weightedMatchedContentCount: 30,
      weightedMatchedContentScore: 30,
      recentContentCount: 100,
    });
    // Only a couple of on-topic posts amid many off-topic ones: little evidence.
    const shallowDiluted = deriveTopicFit({
      matchedContentCount: 2,
      weightedMatchedContentCount: 2,
      weightedMatchedContentScore: 2,
      recentContentCount: 50,
    });

    expect(deepButDiluted.topicFit).toBeGreaterThan(shallowDiluted.topicFit);
  });
});
