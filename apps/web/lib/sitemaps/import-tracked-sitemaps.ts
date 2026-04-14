import { bulkCreateLinks } from "@/lib/api/links/bulk-create-links";
import { fetchSitemapResponse } from "@/lib/sitemaps/safe-fetch-sitemap";
import type { TrackedSitemap } from "@/lib/sitemaps/site-visit-tracking";
import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
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

/** Max unique page URLs per import (single urlset or combined nested sitemaps). Exceeding fails the import. */
export const MAX_URLS_PER_SITEMAP = 10_000;

/** Max nesting level for sitemap indexes (root is depth 0; reject when depth exceeds this). */
const MAX_SITEMAP_INDEX_DEPTH = 5;

/** Max HTTP fetches per import to cap cost on pathological indexes. */
const MAX_SITEMAP_FETCHES_PER_IMPORT = 100;

/** Max links per `bulkCreateLinks` call during import. */
const SITEMAP_IMPORT_BULK_CREATE_BATCH_SIZE = 250;

function normalizeSitemapUrl(url: string): string {
  try {
    return new URL(url.trim()).href;
  } catch {
    return url.trim();
  }
}

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
  const response = await fetchSitemapResponse(sitemapUrl);
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
  const collected = new Set<string>();
  let hadErrors = false;
  const visited = new Set<string>();
  let fetchCount = 0;

  async function crawlRecursive(url: string, depth: number): Promise<void> {
    if (depth > MAX_SITEMAP_INDEX_DEPTH) {
      hadErrors = true;
      return;
    }

    const normalized = normalizeSitemapUrl(url);
    if (visited.has(normalized)) {
      return;
    }

    if (fetchCount >= MAX_SITEMAP_FETCHES_PER_IMPORT) {
      hadErrors = true;
      return;
    }

    visited.add(normalized);
    fetchCount += 1;

    let parsed: SitemapXmlResult;
    try {
      parsed = await fetchAndParseSitemap(url);
    } catch (error) {
      console.error(`Failed to fetch sitemap ${url}:`, error);
      hadErrors = true;
      return;
    }

    const urlsetLocs = toArray(parsed.urlset?.url)
      .map((entry) => entry?.loc?.trim())
      .filter((loc): loc is string => Boolean(loc));

    const pageUrlsThisFile = urlsetLocs.filter((loc) => !loc.endsWith(".xml"));
    const uniqueInThisFile = new Set(pageUrlsThisFile);
    if (uniqueInThisFile.size > MAX_URLS_PER_SITEMAP) {
      throw new Error(
        `Sitemap contains too many unique URLs: ${uniqueInThisFile.size} (max ${MAX_URLS_PER_SITEMAP})`,
      );
    }

    for (const pageUrl of pageUrlsThisFile) {
      if (!collected.has(pageUrl) && collected.size >= MAX_URLS_PER_SITEMAP) {
        throw new Error(
          `Sitemap contains too many unique URLs (max ${MAX_URLS_PER_SITEMAP})`,
        );
      }
      collected.add(pageUrl);
    }

    const indexChildren = toArray(parsed.sitemapindex?.sitemap)
      .map((entry) => entry?.loc?.trim())
      .filter((loc): loc is string => Boolean(loc));

    for (const childUrl of indexChildren) {
      if (fetchCount >= MAX_SITEMAP_FETCHES_PER_IMPORT) {
        hadErrors = true;
        break;
      }
      await crawlRecursive(childUrl, depth + 1);
    }
  }

  await crawlRecursive(sitemapUrl, 0);

  const urls = Array.from(collected);

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
    `[importTrackedSitemaps] Found ${linksToCreate.length} links to create, running bulkCreateLinks in batches of ${SITEMAP_IMPORT_BULK_CREATE_BATCH_SIZE}...`,
  );

  const createdLinks: Awaited<ReturnType<typeof bulkCreateLinks>> = [];
  for (
    let i = 0;
    i < linksToCreate.length;
    i += SITEMAP_IMPORT_BULK_CREATE_BATCH_SIZE
  ) {
    const batch = linksToCreate.slice(
      i,
      i + SITEMAP_IMPORT_BULK_CREATE_BATCH_SIZE,
    );
    const batchCreated = await bulkCreateLinks({
      links: batch,
      skipRedisCache: true,
    });
    createdLinks.push(...batchCreated);
  }

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
