import {
  crawlSitemapUrls,
  MAX_URLS_PER_SITEMAP,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import { parseTrackedSitemaps } from "@/lib/sitemaps/site-visit-tracking";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "zlib";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return ab;
}

function makeFetchResponse(
  body: Buffer,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    arrayBuffer: () => Promise.resolve(toArrayBuffer(body)),
  } as unknown as Response;
}

function redirectResponse(location: string, status = 302): Response {
  return makeFetchResponse(Buffer.alloc(0), status, { Location: location });
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
  it("returns empty array for invalid top-level input", () => {
    expect(parseTrackedSitemaps(null)).toEqual([]);
    expect(parseTrackedSitemaps(undefined)).toEqual([]);
    expect(parseTrackedSitemaps("string")).toEqual([]);
    expect(parseTrackedSitemaps(42)).toEqual([]);
    expect(parseTrackedSitemaps([])).toEqual([]);
    expect(parseTrackedSitemaps({})).toEqual([]);
  });

  it("filters out invalid items (null, primitives, objects without url)", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [null, undefined, 42, "string", {}],
      }),
    ).toEqual([]);
  });

  it("filters out items with empty or whitespace-only URL", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [{ url: "" }, { url: "   " }],
      }),
    ).toEqual([]);
  });

  it("trims URL whitespace", () => {
    const result = parseTrackedSitemaps({
      trackedSitemaps: [{ url: "  https://example.com/sitemap.xml  " }],
    });
    expect(result).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("preserves optional metadata fields when valid", () => {
    const trackedSitemaps = [
      {
        url: "https://example.com/sitemap.xml",
        lastCrawledAt: "2026-03-23T00:00:00.000Z",
        lastUrlCount: 42,
      },
    ];
    expect(parseTrackedSitemaps({ trackedSitemaps })).toEqual(trackedSitemaps);
  });

  it("omits lastCrawledAt when not a string", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [
          { url: "https://example.com/sitemap.xml", lastCrawledAt: 12345 },
        ],
      }),
    ).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("omits lastUrlCount when not a number", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [
          {
            url: "https://example.com/sitemap.xml",
            lastUrlCount: "not-a-number",
          },
        ],
      }),
    ).toEqual([{ url: "https://example.com/sitemap.xml" }]);
  });

  it("returns no sitemaps when the array contains a non-object entry (array-level guard)", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [null, { url: "https://a.com/sitemap.xml" }],
      }),
    ).toEqual([]);
  });

  it("skips invalid URL rows when every entry is a plain object", () => {
    expect(
      parseTrackedSitemaps({
        trackedSitemaps: [
          { url: "" },
          { url: "https://a.com/sitemap.xml" },
          { url: "not-a-url" },
          { url: "https://b.com/sitemap.xml", lastUrlCount: 10 },
        ],
      }),
    ).toEqual([
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
        expect.objectContaining({ redirect: "manual" }),
      );
    });

    it("preserves an existing https:// protocol", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml([]))),
      );

      await crawlSitemapUrls("https://example.com/sitemap.xml");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/sitemap.xml",
        expect.objectContaining({ redirect: "manual" }),
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

    it("rejects a redirect target that resolves to a private host", async () => {
      mockFetch.mockResolvedValueOnce(
        redirectResponse("http://169.254.169.254/latest/meta-data/"),
      );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(urls).toEqual([]);
      expect(hadErrors).toBe(true);
    });

    it("follows a safe redirect chain before parsing XML", async () => {
      mockFetch
        .mockResolvedValueOnce(redirectResponse("https://example.com/b.xml"))
        .mockResolvedValueOnce(
          makeFetchResponse(Buffer.from(urlsetXml(["https://example.com/p"]))),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/a.xml",
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(urls).toEqual(["https://example.com/p"]);
      expect(hadErrors).toBe(false);
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
    it("does not fetch nested sitemaps from a sitemap index", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse(
          Buffer.from(
            sitemapindexXml([
              "https://example.com/sitemap-posts.xml",
              "https://example.com/sitemap-pages.xml",
            ]),
          ),
        ),
      );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual([]);
      expect(hadErrors).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns no page URLs when the index only references itself", async () => {
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

  describe("nested xml in urlset", () => {
    it("skips .xml loc entries instead of treating them as pages", async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse(
          Buffer.from(
            urlsetXml([
              "https://example.com/page-1",
              "https://example.com/nested.xml",
            ]),
          ),
        ),
      );

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual(["https://example.com/page-1"]);
    });
  });

  describe("URL volume limits", () => {
    it(`collects at most ${MAX_URLS_PER_SITEMAP} page URLs from one sitemap`, async () => {
      const many = Array.from({ length: MAX_URLS_PER_SITEMAP + 50 }, (_, i) =>
        i === 0 ? "https://example.com/first" : `https://example.com/p/${i}`,
      );
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml(many))),
      );

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toHaveLength(MAX_URLS_PER_SITEMAP);
      expect(urls[0]).toBe("https://example.com/first");
    });
  });

  describe("error handling", () => {
    it("sets hadErrors when the sitemap response is not OK", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse(Buffer.alloc(0), 500));

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual([]);
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

      const { urls } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toContain("https://example.com/page-1");
    });
  });
});
