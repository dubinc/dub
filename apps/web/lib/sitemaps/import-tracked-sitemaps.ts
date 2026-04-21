import { bulkCreateLinks } from "@/lib/api/links/bulk-create-links";
import type { TrackedSitemap } from "@/lib/sitemaps/site-visit-tracking";
import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { fetchWithTimeout } from "@dub/utils/src";
import { XMLParser } from "fast-xml-parser";

type SitemapXmlUrlEntry = {
  loc?: string;
};

type SitemapXmlResult = {
  urlset?: {
    url?: SitemapXmlUrlEntry | SitemapXmlUrlEntry[];
  };
  sitemapindex?: {
    sitemap?: SitemapXmlUrlEntry | SitemapXmlUrlEntry[];
  };
};

const parser = new XMLParser();

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function extractKeyFromUrl(url: string) {
  const urlObj = new URL(url);
  const key = urlObj.pathname.slice(1);
  return key === "" ? "_root" : key;
}

/** Max page URLs collected from a single registered sitemap file (no nested fetches). */
export const MAX_URLS_PER_SITEMAP = 2000;

async function decompressIfGzip(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  // Gzip magic bytes: 0x1f 0x8b
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(bytes);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const decompressed = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(decompressed);
  }

  return new TextDecoder().decode(bytes);
}

async function fetchAndParseSitemap(
  sitemapUrl: string,
): Promise<SitemapXmlResult> {
  const response = await fetchWithTimeout(sitemapUrl, { redirect: "error" }); // don't follow redirects
  const MAX_SITEMAP_BYTES = 10 * 1024 * 1024; // 10 MB
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_SITEMAP_BYTES) {
    throw new Error(`Sitemap too large (Content-Length: ${contentLength})`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_SITEMAP_BYTES) {
    throw new Error(`Sitemap response too large: ${buffer.byteLength} bytes`);
  }
  const xml = await decompressIfGzip(buffer);
  return parser.parse(xml) as SitemapXmlResult;
}

export async function crawlSitemapUrls(sitemapUrl: string) {
  let hadErrors = false;

  let parsed: SitemapXmlResult;
  try {
    parsed = await fetchAndParseSitemap(sitemapUrl);
  } catch (error) {
    console.error(`Failed to fetch sitemap ${sitemapUrl}:`, error);
    return { urls: [] as string[], hadErrors: true };
  }

  const urlsetLocs = toArray(parsed.urlset?.url)
    .map((entry) => entry?.loc?.trim())
    .filter((url): url is string => Boolean(url));

  const urls = Array.from(
    new Set(urlsetLocs.filter((url) => !url.endsWith(".xml"))),
  );

  if (urls.length > MAX_URLS_PER_SITEMAP) {
    throw new Error(
      `Sitemap contains too many unique URLs: ${urls.length} (max ${MAX_URLS_PER_SITEMAP})`,
    );
  }

  return { urls, hadErrors };
}

export async function importTrackedSitemaps({
  trackedSitemaps,
  domain,
  projectId,
  userId,
  folderId,
}: {
  trackedSitemaps: TrackedSitemap[];
  domain: string;
  projectId: string;
  userId?: string;
  folderId?: string;
}) {
  const nowIso = new Date().toISOString();

  const results = await Promise.all(
    trackedSitemaps.map(async (sitemap) => {
      const sitemapLinks = new Map<string, ProcessedLinkProps>();

      try {
        const { urls: crawledUrls, hadErrors } = await crawlSitemapUrls(
          sitemap.url,
        );

        for (const url of crawledUrls) {
          let key: string;
          try {
            key = extractKeyFromUrl(url);
          } catch {
            continue;
          }

          if (!sitemapLinks.has(key)) {
            sitemapLinks.set(key, {
              domain,
              key,
              url,
              trackConversion: true,
              projectId,
              ...(userId ? { userId } : {}),
              ...(folderId ? { folderId } : {}),
            });
          }
        }

        if (hadErrors) {
          return { sitemap: { ...sitemap }, sitemapLinks };
        }

        return {
          sitemap: {
            ...sitemap,
            lastCrawledAt: nowIso,
            lastUrlCount: crawledUrls.length,
          },
          sitemapLinks,
        };
      } catch (error) {
        console.error(`Failed to crawl sitemap ${sitemap.url}:`, error);

        return { sitemap: { ...sitemap }, sitemapLinks };
      }
    }),
  );

  const linksByKey = new Map<string, ProcessedLinkProps>();
  for (const { sitemapLinks } of results) {
    for (const [key, link] of sitemapLinks) {
      if (!linksByKey.has(key)) {
        linksByKey.set(key, link);
      }
    }
  }

  const updatedTrackedSitemaps = results.map((r) => r.sitemap);

  const candidateLinks = Array.from(linksByKey.values());
  const candidateKeys = candidateLinks.map((link) => link.key);

  const existingLinks = await prisma.link.findMany({
    where: {
      domain,
      key: {
        in: candidateKeys,
      },
    },
    select: {
      key: true,
    },
  });

  const existingKeys = new Set(existingLinks.map((link) => link.key));

  const linksToCreate = candidateLinks.filter(
    (link) => !existingKeys.has(link.key),
  );

  console.log(
    `[importTrackedSitemaps] Found ${linksToCreate.length} links to create, running bulkCreateLinks...`,
  );

  const createdLinks = await bulkCreateLinks({
    links: linksToCreate,
    skipRedisCache: true,
  });

  console.log({
    linksToCreate,
    createdLinks,
    updatedTrackedSitemaps,
  });

  return {
    linksToCreate,
    createdLinks,
    updatedTrackedSitemaps,
  };
}
