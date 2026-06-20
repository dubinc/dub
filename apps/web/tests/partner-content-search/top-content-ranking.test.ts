import { PARTNER_CONTENT_SEARCH_TOP_CONTENT } from "@/lib/partner-content-search/constants";
import {
  getBlendedTopContentScore,
  getEngagementScore,
  getViewBaseline,
} from "@/lib/partner-content-search/top-content-ranking";
import { describe, expect, test } from "vitest";

describe("top content ranking", () => {
  test("view baseline is the median and ignores zero/missing views", () => {
    expect(getViewBaseline([100, 200, 300, null, 0, undefined])).toBe(200);
  });

  test("view baseline is robust to a single viral outlier", () => {
    const typical = [100, 120, 90, 110, 105];
    const withViral = [...typical, 5_000_000];

    // One viral post barely moves the median (a mean would jump to ~830k).
    expect(getViewBaseline(withViral)!).toBeLessThan(150);
    expect(getViewBaseline(withViral)!).toBeGreaterThan(100);
  });

  test("a median post scores about 0.5 engagement", () => {
    const score = getEngagementScore({ views: 1000, baselineViews: 1000 });
    expect(score).toBeCloseTo(0.5, 5);
  });

  test("a viral post saturates toward 1 without running away", () => {
    const big = getEngagementScore({ views: 1_000_000, baselineViews: 1000 })!;
    const huge = getEngagementScore({ views: 100_000_000, baselineViews: 1000 })!;

    expect(big).toBeGreaterThan(0.9);
    expect(big).toBeLessThan(1);
    // 100x more views than the already-viral post barely moves the score: the
    // outlier is bounded, it can't dominate the blend.
    expect(huge - big).toBeLessThan(0.05);
    expect(huge).toBeLessThan(1);
  });

  test("a below-median post lands near 0 but is never negative", () => {
    const score = getEngagementScore({ views: 10, baselineViews: 10_000 })!;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });

  test("engagement is unavailable without a usable signal", () => {
    expect(getEngagementScore({ views: 1000, baselineViews: null })).toBeNull();
    expect(getEngagementScore({ views: 1000, baselineViews: 0 })).toBeNull();
    expect(getEngagementScore({ views: null, baselineViews: 1000 })).toBeNull();
    expect(getEngagementScore({ views: 0, baselineViews: 1000 })).toBeNull();
  });

  test("a high-relevance typical post outranks a low-relevance viral post", () => {
    const baselineViews = 1000;
    const relevantTypical = getBlendedTopContentScore({
      relevance: 0.9,
      views: 1000,
      baselineViews,
    });
    const irrelevantViral = getBlendedTopContentScore({
      relevance: 0.3,
      views: 10_000_000,
      baselineViews,
    });

    expect(relevantTypical).toBeGreaterThan(irrelevantViral);
  });

  test("among similarly-relevant posts the higher-view one wins", () => {
    const baselineViews = 1000;
    const lowViews = getBlendedTopContentScore({
      relevance: 0.7,
      views: 200,
      baselineViews,
    });
    const highViews = getBlendedTopContentScore({
      relevance: 0.7,
      views: 50_000,
      baselineViews,
    });

    expect(highViews).toBeGreaterThan(lowViews);
  });

  test("falls back to pure relevance when there's no engagement signal", () => {
    expect(
      getBlendedTopContentScore({
        relevance: 0.42,
        views: null,
        baselineViews: null,
      }),
    ).toBe(0.42);
  });

  test("blend weights sum to one so a perfect post scores one", () => {
    const { relevanceWeight, engagementWeight } =
      PARTNER_CONTENT_SEARCH_TOP_CONTENT;
    expect(relevanceWeight + engagementWeight).toBeCloseTo(1, 5);
  });
});
