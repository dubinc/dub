import {
  mergeSiteVisitTrackingSettings,
  parseSiteVisitTrackingSettings,
  replaceTrackedSitemapsInColumn,
} from "@/lib/sitemaps/site-visit-tracking";
import { MAX_TRACKED_SITEMAPS_PER_WORKSPACE } from "@/lib/zod/schemas/site-visit-tracking";
import { describe, expect, it } from "vitest";

describe("parseSiteVisitTrackingSettings", () => {
  it("parses object shape with optional fields", () => {
    const parsed = parseSiteVisitTrackingSettings({
      trackedSitemaps: [{ url: "https://b.com/sitemap.xml" }],
      siteDomainSlug: "dub.sh",
      siteLinksFolderId: "fold_1",
    });
    expect(parsed.trackedSitemaps).toHaveLength(1);
    expect(parsed.siteDomainSlug).toBe("dub.sh");
    expect(parsed.siteLinksFolderId).toBe("fold_1");
  });

  it("returns empty defaults for null, non-object, or array input", () => {
    expect(parseSiteVisitTrackingSettings(null).trackedSitemaps).toEqual([]);
    expect(parseSiteVisitTrackingSettings("x").trackedSitemaps).toEqual([]);
    expect(parseSiteVisitTrackingSettings([]).trackedSitemaps).toEqual([]);
  });

  it("keeps at most MAX_TRACKED_SITEMAPS_PER_WORKSPACE entries (deterministic slice)", () => {
    const many = Array.from({ length: MAX_TRACKED_SITEMAPS_PER_WORKSPACE + 5 }, (_, i) => ({
      url: `https://example.com/s${i}.xml`,
    }));
    const parsed = parseSiteVisitTrackingSettings({ trackedSitemaps: many });
    expect(parsed.trackedSitemaps).toHaveLength(MAX_TRACKED_SITEMAPS_PER_WORKSPACE);
    expect(parsed.trackedSitemaps[0]?.url).toBe("https://example.com/s0.xml");
    expect(parsed.trackedSitemaps.at(-1)?.url).toBe(
      `https://example.com/s${MAX_TRACKED_SITEMAPS_PER_WORKSPACE - 1}.xml`,
    );
  });

  it("returns no sitemaps when the array contains a non-object entry among the capped prefix", () => {
    expect(
      parseSiteVisitTrackingSettings({
        trackedSitemaps: [{ url: "https://a.com/s.xml" }, null],
      }).trackedSitemaps,
    ).toEqual([]);
    expect(
      parseSiteVisitTrackingSettings({
        trackedSitemaps: ["not-an-object"],
      }).trackedSitemaps,
    ).toEqual([]);
  });
});

describe("mergeSiteVisitTrackingSettings", () => {
  it("merges partial patch without wiping other keys", () => {
    const merged = mergeSiteVisitTrackingSettings(
      {
        trackedSitemaps: [{ url: "https://a.com/sitemap.xml" }],
        siteDomainSlug: "dub.sh",
        siteLinksFolderId: "fold_x",
      },
      { trackedSitemaps: [{ url: "https://b.com/sitemap.xml" }] },
    );
    expect(merged?.siteDomainSlug).toBe("dub.sh");
    expect(merged?.siteLinksFolderId).toBe("fold_x");
    expect(merged?.trackedSitemaps).toHaveLength(1);
    expect(merged?.trackedSitemaps[0]?.url).toBe("https://b.com/sitemap.xml");
  });

  it("returns null when patch is null", () => {
    expect(
      mergeSiteVisitTrackingSettings({ trackedSitemaps: [] }, null),
    ).toBeNull();
  });
});

describe("replaceTrackedSitemapsInColumn", () => {
  it("preserves siteDomainSlug and siteLinksFolderId", () => {
    const next = replaceTrackedSitemapsInColumn(
      {
        trackedSitemaps: [{ url: "https://old.com/sitemap.xml" }],
        siteDomainSlug: "dub.sh",
        siteLinksFolderId: "fold_1",
      },
      [{ url: "https://new.com/sitemap.xml" }],
    );
    expect(next.siteDomainSlug).toBe("dub.sh");
    expect(next.siteLinksFolderId).toBe("fold_1");
    expect(next.trackedSitemaps[0]?.url).toBe("https://new.com/sitemap.xml");
  });
});
