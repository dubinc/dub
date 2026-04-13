import { bulkCreateLinks } from "@/lib/api/links/bulk-create-links";
import { isIpInRange } from "@/lib/middleware/utils/is-ip-in-range";
import type { TrackedSitemap } from "@/lib/sitemaps/site-visit-tracking";
import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { XMLParser } from "fast-xml-parser";

export { parseTrackedSitemaps } from "@/lib/sitemaps/site-visit-tracking";
export type { TrackedSitemap } from "@/lib/sitemaps/site-visit-tracking";

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

const PRIVATE_IPV4_CIDRS = [
  "127.0.0.0/8", // Loopback
  "10.0.0.0/8", // Private
  "172.16.0.0/12", // Private
  "192.168.0.0/16", // Private
  "169.254.0.0/16", // Link-local
];

const PRIVATE_IPV6_PATTERNS = [/^::1$/, /^fc[0-9a-f]{2}:/i, /^fd[0-9a-f]{2}:/i];

const BLOCKED_HOSTNAMES = new Set(["localhost", "broadcasthost"]);

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower) || lower.endsWith(".local")) {
    return true;
  }

  if (PRIVATE_IPV4_CIDRS.some((cidr) => isIpInRange(lower, cidr))) {
    return true;
  }

  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(lower));
}

function normalizeSitemapUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new Error("Sitemap URL is empty.");
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid sitemap URL: ${trimmed}`);
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error(
      `Sitemap URL points to a private or reserved address: ${parsed.hostname}`,
    );
  }

  return parsed.toString();
}

function extractKeyFromUrl(url: string) {
  const urlObj = new URL(url);
  const key = urlObj.pathname.slice(1);
  return key === "" ? "_root" : key;
}

/** Nested sitemap documents linked from a urlset; users add these as separate tracked sources. */
function isNestedXmlSitemapUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".xml");
  } catch {
    return false;
  }
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 10;

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

async function fetchSitemapWithSsrfSafeRedirects(
  initialUrl: string,
): Promise<Response> {
  let currentUrl = normalizeSitemapUrl(initialUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      if (!location) {
        throw new Error(
          `Sitemap redirect (${response.status}) missing Location header: ${currentUrl}`,
        );
      }
      if (hop === MAX_REDIRECTS) {
        throw new Error(
          `Too many redirects while fetching sitemap (max ${MAX_REDIRECTS}).`,
        );
      }
      const resolved = new URL(location, currentUrl).href;
      currentUrl = normalizeSitemapUrl(resolved);
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch sitemap (${response.status}): ${currentUrl}`,
      );
    }

    return response;
  }

  throw new Error(`Too many redirects while fetching sitemap.`);
}

async function fetchAndParseSitemap(url: string): Promise<SitemapXmlResult> {
  const response = await fetchSitemapWithSsrfSafeRedirects(url);
  const buffer = await response.arrayBuffer();
  const xml = await decompressIfGzip(buffer);
  return parser.parse(xml) as SitemapXmlResult;
}

/**
 * Fetches a single sitemap URL (with SSRF-safe redirect handling). Does not follow
 * nested sitemap index entries or .xml urls inside a urlset — those must be added
 * as separate tracked sitemaps.
 */
export async function crawlSitemapUrls(rootSitemapUrl: string) {
  const discoveredUrls = new Set<string>();
  let hadErrors = false;

  const sitemapUrl = normalizeSitemapUrl(rootSitemapUrl);

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

  const pageUrls = urlsetLocs.filter((url) => !isNestedXmlSitemapUrl(url));

  for (const pageUrl of pageUrls) {
    if (discoveredUrls.size >= MAX_URLS_PER_SITEMAP) {
      break;
    }
    discoveredUrls.add(pageUrl);
  }

  // sitemapindex children are intentionally not fetched; users register each file separately.

  return { urls: Array.from(discoveredUrls), hadErrors };
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
            lastUrlCount: nonSitemapUrls.length,
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
