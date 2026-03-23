import { bulkCreateLinks } from "@/lib/api/links/bulk-create-links";
import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { XMLParser } from "fast-xml-parser";

export interface TrackedSitemap {
  url: string;
  lastCrawledAt?: string;
  lastUrlCount?: number;
}

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

export function parseTrackedSitemaps(value: unknown): TrackedSitemap[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const sitemap = item as TrackedSitemap;
      const url = typeof sitemap.url === "string" ? sitemap.url.trim() : "";

      if (!url) {
        return null;
      }

      return {
        url,
        ...(typeof sitemap.lastCrawledAt === "string"
          ? { lastCrawledAt: sitemap.lastCrawledAt }
          : {}),
        ...(typeof sitemap.lastUrlCount === "number"
          ? { lastUrlCount: sitemap.lastUrlCount }
          : {}),
      };
    })
    .filter((sitemap): sitemap is TrackedSitemap => Boolean(sitemap));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeSitemapUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new Error("Sitemap URL is empty.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function extractKeyFromUrl(url: string) {
  const urlObj = new URL(url);
  const key = urlObj.pathname.slice(1);
  return key === "" ? "_root" : key;
}

function isSitemapLikeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return pathname.endsWith(".xml") && pathname.includes("sitemap");
  } catch {
    return false;
  }
}

async function fetchAndParseSitemap(url: string): Promise<SitemapXmlResult> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap (${response.status}): ${url}`);
  }

  const xml = await response.text();
  return parser.parse(xml) as SitemapXmlResult;
}

export async function crawlSitemapUrls(rootSitemapUrl: string) {
  const visitedSitemaps = new Set<string>();
  const discoveredUrls = new Set<string>();
  const queue = [normalizeSitemapUrl(rootSitemapUrl)];

  while (queue.length > 0) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) {
      continue;
    }

    visitedSitemaps.add(sitemapUrl);

    let parsed: SitemapXmlResult;
    try {
      parsed = await fetchAndParseSitemap(sitemapUrl);
    } catch (error) {
      console.error(`Failed to fetch nested sitemap ${sitemapUrl}:`, error);
      continue;
    }

    const urlsetLocs = toArray(parsed.urlset?.url)
      .map((entry) => entry?.loc?.trim())
      .filter((url): url is string => Boolean(url));

    const nestedSitemapsFromUrlset = urlsetLocs
      .filter((url) => isSitemapLikeUrl(url))
      .map((url) => normalizeSitemapUrl(url));

    const pageUrls = urlsetLocs.filter((url) => !isSitemapLikeUrl(url));

    for (const pageUrl of pageUrls) {
      discoveredUrls.add(pageUrl);
    }

    const nestedSitemaps = toArray(parsed.sitemapindex?.sitemap)
      .map((entry) => entry?.loc?.trim())
      .filter((url): url is string => Boolean(url))
      .map((url) => normalizeSitemapUrl(url));

    for (const nestedSitemap of [
      ...nestedSitemaps,
      ...nestedSitemapsFromUrlset,
    ]) {
      if (!visitedSitemaps.has(nestedSitemap)) {
        queue.push(nestedSitemap);
      }
    }
  }

  return Array.from(discoveredUrls);
}

export async function importTrackedSitemaps({
  trackedSitemaps,
  domain,
  projectId,
  userId,
  folderId,
  skipRedisCache = true,
}: {
  trackedSitemaps: TrackedSitemap[];
  domain: string;
  projectId: string;
  userId?: string;
  folderId?: string;
  skipRedisCache?: boolean;
}) {
  const nowIso = new Date().toISOString();

  const linksByKey = new Map<string, ProcessedLinkProps>();

  const updatedTrackedSitemaps = await Promise.all(
    trackedSitemaps.map(async (sitemap) => {
      try {
        const crawledUrls = await crawlSitemapUrls(sitemap.url);

        const nonSitemapUrls = crawledUrls.filter(
          (url) => !url.endsWith("sitemap.xml"),
        );

        for (const url of nonSitemapUrls) {
          let key: string;
          try {
            key = extractKeyFromUrl(url);
          } catch {
            continue;
          }

          if (!linksByKey.has(key)) {
            linksByKey.set(key, {
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

        return {
          ...sitemap,
          lastCrawledAt: nowIso,
          lastUrlCount: nonSitemapUrls.length,
        };
      } catch (error) {
        console.error(`Failed to crawl sitemap ${sitemap.url}:`, error);

        return {
          ...sitemap,
          lastCrawledAt: nowIso,
        };
      }
    }),
  );

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

  const createdLinks = await bulkCreateLinks({
    links: linksToCreate,
    skipRedisCache,
  });

  return {
    linksToCreate,
    createdLinks,
    updatedTrackedSitemaps,
  };
}
