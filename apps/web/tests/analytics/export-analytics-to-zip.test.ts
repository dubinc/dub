import {
  exportAnalyticsToZip,
  getAnalyticsExportEndpoints,
  PARTNER_PROFILE_SKIP_ENDPOINTS,
} from "@/lib/analytics/export-analytics-to-zip";
import { getAnalytics } from "@/lib/analytics/get-analytics";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/analytics/get-analytics", () => ({
  getAnalytics: vi.fn(),
}));

describe("export-analytics-to-zip", () => {
  beforeEach(() => {
    vi.mocked(getAnalytics).mockReset();
    vi.mocked(getAnalytics).mockResolvedValue([
      { clicks: 10, leads: 2, sales: 1, saleAmount: 5000 },
    ]);
  });

  describe("getAnalyticsExportEndpoints", () => {
    test("skips count by default", () => {
      const endpoints = getAnalyticsExportEndpoints({});

      expect(endpoints).not.toContain("count");
      expect(endpoints).toContain("top_links");
    });

    test("skips top_links when filtering to a single link", () => {
      const endpoints = getAnalyticsExportEndpoints({
        skipTopLinksForSingleLink: true,
      });

      expect(endpoints).not.toContain("top_links");
    });

    test("skips partner-profile endpoints", () => {
      const endpoints = getAnalyticsExportEndpoints({
        skipEndpoints: PARTNER_PROFILE_SKIP_ENDPOINTS,
      });

      expect(endpoints).not.toContain("top_partners");
      expect(endpoints).not.toContain("top_groups");
      expect(endpoints).not.toContain("top_folders");
      expect(endpoints).toContain("top_links");
    });
  });

  describe("exportAnalyticsToZip", () => {
    test("uses composite event when useComposite is true", async () => {
      await exportAnalyticsToZip({
        params: { event: "sales", interval: "30d" },
        workspaceId: "ws_123",
        useComposite: true,
        skipEndpoints: ["count", "timeseries", "continents"],
      });

      for (const call of vi.mocked(getAnalytics).mock.calls) {
        expect(call[0]?.event).toBe("composite");
      }
    });

    test("preserves client event when useComposite is false", async () => {
      await exportAnalyticsToZip({
        params: { event: "sales", interval: "30d" },
        workspaceId: "ws_123",
        useComposite: false,
        skipEndpoints: ["count", "timeseries", "continents"],
      });

      for (const call of vi.mocked(getAnalytics).mock.calls) {
        expect(call[0]?.event).toBe("sales");
      }
    });

    test("fetches endpoints sequentially", async () => {
      const callOrder: string[] = [];

      vi.mocked(getAnalytics).mockImplementation(async ({ groupBy }) => {
        callOrder.push(groupBy!);
        return [{ clicks: 1, leads: 0, sales: 0, saleAmount: 0 }];
      });

      await exportAnalyticsToZip({
        params: { event: "clicks", interval: "30d" },
        workspaceId: "ws_123",
        useComposite: false,
        skipEndpoints: [
          "count",
          "continents",
          "regions",
          "countries",
          "cities",
          "devices",
          "browsers",
          "os",
          "trigger",
          "triggers",
          "referers",
          "referer_urls",
          "top_folders",
          "top_link_tags",
          "top_domains",
          "top_urls",
          "top_base_urls",
          "top_partners",
          "top_groups",
          "top_partner_tags",
          "utm_sources",
          "utm_mediums",
          "utm_campaigns",
          "utm_terms",
          "utm_contents",
        ],
      });

      expect(callOrder).toEqual(["timeseries", "top_links"]);
    });

    test("includes composite metrics in generated zip", async () => {
      vi.mocked(getAnalytics).mockResolvedValue([
        {
          link: "link_123",
          clicks: 953,
          leads: 12,
          sales: 2,
          saleAmount: 10000,
        },
      ]);

      const zipData = await exportAnalyticsToZip({
        params: { event: "sales", interval: "30d" },
        workspaceId: "ws_123",
        useComposite: true,
        skipEndpoints: [
          "count",
          "timeseries",
          "continents",
          "regions",
          "countries",
          "cities",
          "devices",
          "browsers",
          "os",
          "trigger",
          "triggers",
          "referers",
          "referer_urls",
          "top_folders",
          "top_link_tags",
          "top_domains",
          "top_urls",
          "top_base_urls",
          "top_partners",
          "top_groups",
          "top_partner_tags",
          "utm_sources",
          "utm_mediums",
          "utm_campaigns",
          "utm_terms",
          "utm_contents",
        ],
      });

      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(new Uint8Array(zipData));
      const topLinksCsv = await zip.file("top_links.csv")?.async("string");

      expect(topLinksCsv).toContain("clicks");
      expect(topLinksCsv).toContain("leads");
      expect(topLinksCsv).toContain("sales");
      expect(topLinksCsv).toContain("953");
      expect(topLinksCsv).toContain("12");
      expect(topLinksCsv).toContain("2");
    });
  });
});
