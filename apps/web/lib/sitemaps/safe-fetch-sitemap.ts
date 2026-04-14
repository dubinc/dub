import { fetchWithTimeout } from "@dub/utils/src";
import dns from "dns/promises";
import net from "net";

/** Max HTTP redirects when fetching a sitemap (e.g. CDN → object storage). */
export const MAX_SITEMAP_REDIRECTS = 2;

const FETCH_TIMEOUT_MS = 15_000;

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) {
    return true;
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;
  const first = lower.split(":")[0];
  if (first.length >= 2 && (first.startsWith("fc") || first.startsWith("fd"))) {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const embedded = lower.slice(7).split("%")[0];
    if (net.isIPv4(embedded)) {
      return isBlockedIpv4(embedded);
    }
  }
  return false;
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isBlockedIpv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isBlockedIpv6(ip);
  }
  return true;
}

/**
 * Resolve hostname and ensure no resolved address is private / loopback / metadata (SSRF guard).
 */
export async function assertResolvedHostSafe(hostname: string): Promise<void> {
  if (hostname === "localhost") {
    throw new Error("Blocked hostname");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
    throw new Error("Blocked hostname");
  }

  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Blocked IP address");
    }
    return;
  }

  const ips: string[] = [];
  try {
    ips.push(...(await dns.resolve4(hostname)));
  } catch {
    // ignore
  }
  try {
    ips.push(...(await dns.resolve6(hostname)));
  } catch {
    // ignore
  }

  if (ips.length === 0) {
    throw new Error("Hostname did not resolve");
  }

  for (const ip of ips) {
    if (isBlockedIp(ip)) {
      throw new Error("Hostname resolves to a blocked address");
    }
  }
}

/**
 * Validates URL shape and that the host resolves to a public address (SSRF mitigation).
 * Call before each redirect hop and the initial request.
 */
export async function assertSitemapFetchUrlSafe(
  urlString: string,
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid sitemap URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP(S) sitemap URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Sitemap URL must not contain credentials");
  }

  if (!parsed.hostname) {
    throw new Error("Invalid sitemap host");
  }

  await assertResolvedHostSafe(parsed.hostname);
}

/**
 * Fetches a sitemap response, following redirects with a cap and validating each hop (SSRF-safe).
 */
export async function fetchSitemapResponse(
  startUrl: string,
): Promise<Response> {
  let currentUrl = new URL(startUrl).href;
  let redirectCount = 0;

  while (redirectCount <= MAX_SITEMAP_REDIRECTS) {
    await assertSitemapFetchUrlSafe(currentUrl);

    const response = await fetchWithTimeout(
      currentUrl,
      { redirect: "manual" },
      FETCH_TIMEOUT_MS,
    );

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing Location header");
      }
      currentUrl = new URL(location, currentUrl).href;
      redirectCount += 1;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Sitemap fetch failed: ${response.status}`);
    }

    return response;
  }

  throw new Error(`Too many sitemap redirects (max ${MAX_SITEMAP_REDIRECTS})`);
}
