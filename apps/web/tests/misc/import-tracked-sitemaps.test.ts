import {
  crawlSitemapUrls,
  parseTrackedSitemaps,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "zlib";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return ab;
}

function makeFetchResponse(body: Buffer, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: () => Promise.resolve(toArrayBuffer(body)),
  } as unknown as Response;
}

const urlsetXml = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((u) => `<url><loc>${u}</loc></url>`).join("\n  ")}
</urlset>`;

const sitemapindexXml = (sitemaps: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join("\n  ")}
</sitemapindex>`;

describe("parseTrackedSitemaps", () => {
  it("returns empty array for non-array input", () => {
    expect(parseTrackedSitemaps(null)).toEqual([]);
    expect(parseTrackedSitemaps(undefined)).toEqual([]);
    expect(parseTrackedSitemaps("string")).toEqual([]);
    expect(parseTrackedSitemaps(42)).toEqual([]);
    expect(parseTrackedSitemaps({})).toEqual([]);
  });

  it("filters out invalid items (null, primitives, objects without url)", () => {
    expect(parseTrackedSitemaps([null, undefined, 42, "string", {}])).toEqual(
      [],
    );
  });

  it("filters out items with empty or whitespace-only URL", () => {
    expect(parseTrackedSitemaps([{ url: "" }, { url: "   " }])).toEqual([]);
  });

  it("trims URL whitespace", () => {
    const result = parseTrackedSitemaps([
      { url: "  https://example.com/sitemap.xml  " },
    ]);
    expect(result).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("preserves optional metadata fields when valid", () => {
    const input = [
      {
        url: "https://example.com/sitemap.xml",
        lastCrawledAt: "2026-03-23T00:00:00.000Z",
        lastUrlCount: 42,
      },
    ];
    expect(parseTrackedSitemaps(input)).toEqual(input);
  });

  it("omits lastCrawledAt when not a string", () => {
    expect(
      parseTrackedSitemaps([
        { url: "https://example.com/sitemap.xml", lastCrawledAt: 12345 },
      ]),
    ).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("omits lastUrlCount when not a number", () => {
    expect(
      parseTrackedSitemaps([
        {
          url: "https://example.com/sitemap.xml",
          lastUrlCount: "not-a-number",
        },
      ]),
    ).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("handles mixed valid/invalid items in the same array", () => {
    const input = [
      null,
      { url: "https://a.com/sitemap.xml" },
      { url: "" },
      { url: "https://b.com/sitemap.xml", lastUrlCount: 10 },
    ];
    expect(parseTrackedSitemaps(input)).toEqual([
      { url: "https://a.com/sitemap.xml" },
      { url: "https://b.com/sitemap.xml", lastUrlCount: 10 },
    ]);
  });
});

describe("crawlSitemapUrls", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("URL normalization", () => {
    it("throws for an empty URL", async () => {
      await expect(crawlSitemapUrls("")).rejects.toThrow(
        "Sitemap URL is empty.",
      );
    });

    it("adds https:// when no protocol is provided", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml(["https://example.com/page"]))),
      );

      await crawlSitemapUrls("example.com/sitemap.xml");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/sitemap.xml",
        expect.anything(),
      );
    });

    it("preserves an existing https:// protocol", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml([]))),
      );

      await crawlSitemapUrls("https://example.com/sitemap.xml");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/sitemap.xml",
        expect.anything(),
      );
    });
  });

  describe("SSRF protection", () => {
    it.each([
      ["localhost"],
      ["127.0.0.1"],
      ["10.0.0.1"],
      ["192.168.1.1"],
      ["172.16.0.1"],
      ["169.254.1.1"],
      ["my-server.local"],
    ])("rejects private/reserved host: %s", async (hostname) => {
      await expect(
        crawlSitemapUrls(`https://${hostname}/sitemap.xml`),
      ).rejects.toThrow(/private or reserved address/);
    });

    it("silently skips private-host URLs discovered inside nested sitemaps", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              sitemapindexXml([
                "https://192.168.1.1/internal.xml",
                "https://example.com/safe.xml",
              ]),
            ),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/page-1"])),
          ),
        );

      const { urls } = await crawlSitemapUrls("https://example.com/sitemap.xml");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(urls).toContain("https://example.com/page-1");
    });
  });

  describe("flat urlset", () => {
    it("returns all page URLs from a simple urlset", async () => {
      const pageUrls = [
        "https://example.com/page-1",
        "https://example.com/page-2",
      ];
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml(pageUrls))),
      );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual(expect.arrayContaining(pageUrls));
      expect(urls).toHaveLength(pageUrls.length);
      expect(hadErrors).toBe(false);
    });

    it("deduplicates URLs across multiple entries", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(
          Buffer.from(
            urlsetXml([
              "https://example.com/page-1",
              "https://example.com/page-1",
            ]),
          ),
        ),
      );

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toHaveLength(1);
    });
  });

  describe("sitemapindex", () => {
    it("recursively crawls all nested sitemaps", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              sitemapindexXml([
                "https://example.com/sitemap-posts.xml",
                "https://example.com/sitemap-pages.xml",
              ]),
            ),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/post-1"])),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/page-1"])),
          ),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual(
        expect.arrayContaining([
          "https://example.com/post-1",
          "https://example.com/page-1",
        ]),
      );
      expect(hadErrors).toBe(false);
    });

    it("does not visit the same sitemap URL twice (cycle protection)", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(
          Buffer.from(sitemapindexXml(["https://example.com/sitemap.xml"])),
        ),
      );

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("skips a failed nested sitemap, continues crawling, and sets hadErrors", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              sitemapindexXml([
                "https://example.com/broken.xml",
                "https://example.com/good.xml",
              ]),
            ),
          ),
        )
        .mockResolvedValueOnce(makeFetchResponse(Buffer.from("not xml"), 500))
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/page-1"])),
          ),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toContain("https://example.com/page-1");
      expect(hadErrors).toBe(true);
    });
  });

  describe("gzip support", () => {
    it("decompresses a gzip-compressed sitemap response", async () => {
      const xml = urlsetXml(["https://example.com/page-1"]);
      const compressed = gzipSync(xml);
      mockFetch.mockResolvedValue(makeFetchResponse(compressed));

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml.gz",
      );

      expect(urls).toContain("https://example.com/page-1");
    });

    it("handles a plain XML response without attempting decompression", async () => {
      const xml = urlsetXml(["https://example.com/page-1"]);
      mockFetch.mockResolvedValue(makeFetchResponse(Buffer.from(xml)));

      const { urls } = await crawlSitemapUrls("https://example.com/sitemap.xml");

      expect(urls).toContain("https://example.com/page-1");
    });
  });
});
