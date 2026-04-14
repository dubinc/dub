import {
  crawlSitemapUrls,
  MAX_URLS_PER_SITEMAP,
} from "@/lib/sitemaps/import-tracked-sitemaps";
import { parseTrackedSitemaps } from "@/lib/sitemaps/site-visit-tracking";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "zlib";

vi.mock("dns/promises", () => ({
  default: {
    resolve4: vi.fn(async () => ["93.184.216.34"]),
    resolve6: vi.fn(async () => []),
  },
}));

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

  describe("flat urlset", () => {
    it("follows HTTP redirects before reading the sitemap", async () => {
      mockFetch
        .mockResolvedValueOnce(
          redirectResponse("https://cdn.example.com/sitemap.xml"),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/page-1"])),
          ),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml.gz",
      );

      expect(urls).toEqual(["https://example.com/page-1"]);
      expect(hadErrors).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

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
    it("fetches child sitemaps from a sitemap index and merges page URLs", async () => {
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
            Buffer.from(
              urlsetXml([
                "https://example.com/blog/post-a",
                "https://example.com/blog/post-b",
              ]),
            ),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              urlsetXml([
                "https://example.com/about",
                "https://example.com/pricing",
              ]),
            ),
          ),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual(
        expect.arrayContaining([
          "https://example.com/blog/post-a",
          "https://example.com/blog/post-b",
          "https://example.com/about",
          "https://example.com/pricing",
        ]),
      );
      expect(urls).toHaveLength(4);
      expect(hadErrors).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("returns no page URLs when the index only references itself (cycle)", async () => {
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

    it("follows a nested sitemap index before reaching a urlset", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              sitemapindexXml(["https://example.com/blog/sitemap.xml"]),
            ),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(
              sitemapindexXml(["https://example.com/blog/sitemap-posts.xml"]),
            ),
          ),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(
            Buffer.from(urlsetXml(["https://example.com/blog/hello"])),
          ),
        );

      const { urls, hadErrors } = await crawlSitemapUrls(
        "https://example.com/sitemap.xml",
      );

      expect(urls).toEqual(["https://example.com/blog/hello"]);
      expect(hadErrors).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
    it(`throws when one sitemap has more than ${MAX_URLS_PER_SITEMAP} unique page URLs`, async () => {
      const many = Array.from({ length: MAX_URLS_PER_SITEMAP + 50 }, (_, i) =>
        i === 0 ? "https://example.com/first" : `https://example.com/p/${i}`,
      );
      mockFetch.mockResolvedValue(
        makeFetchResponse(Buffer.from(urlsetXml(many))),
      );

      await expect(
        crawlSitemapUrls("https://example.com/sitemap.xml"),
      ).rejects.toThrow(
        `Sitemap contains too many unique URLs: ${MAX_URLS_PER_SITEMAP + 50} (max ${MAX_URLS_PER_SITEMAP})`,
      );
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
