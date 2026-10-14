/**
 * SSRF-safe outbound fetch.
 *
 * Wraps `fetch` with three protections against attacker-controlled URLs:
 *   1. Scheme allowlist: only `http:` and `https:` are permitted.
 *   2. Host check: the hostname is resolved (IPv4 + IPv6 via Google DoH) and
 *      every returned address is checked against a deny-list of private,
 *      loopback, link-local, cloud-metadata, multicast, and reserved ranges.
 *   3. Manual redirect handling: each hop's `Location` is re-validated, so a
 *      whitelisted host cannot bounce us into an internal IP.
 *
 * Node sibling is `Storage.assertSafeUrl` in `storage.ts`. This module uses
 * DoH because it runs on the Edge runtime, which has no `node:dns`.
 */

import { DubApiError } from "@/lib/api/errors";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REDIRECTS = 5;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const PRIVATE_IPV4_CIDRS = [
  "0.0.0.0/8", // current network
  "10.0.0.0/8", // RFC1918
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local + cloud metadata
  "172.16.0.0/12", // RFC1918
  "192.0.0.0/24", // IETF protocol assignments
  "192.168.0.0/16", // RFC1918
  "198.18.0.0/15", // benchmarking
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
];

function ipv4ToInt(ip: string): number | null {
  const m = IPV4_REGEX.exec(ip);
  if (!m) return null;
  const octets = [m[1], m[2], m[3], m[4]].map((s) => parseInt(s, 10));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
  );
}

function ipv4InCidr(ipInt: number, cidr: string): boolean {
  const [rangeIp, prefix] = cidr.split("/");
  const prefixLen = parseInt(prefix, 10);
  const rangeInt = ipv4ToInt(rangeIp);
  if (rangeInt === null || prefixLen < 0 || prefixLen > 32) return false;
  if (prefixLen === 0) return true;
  const mask = (0xffffffff << (32 - prefixLen)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isPrivateIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  // Unparseable → fail closed.
  if (ipInt === null) return true;
  return PRIVATE_IPV4_CIDRS.some((c) => ipv4InCidr(ipInt, c));
}

/** Expand an IPv6 string (possibly with embedded IPv4) to 8 hextets. */
function expandIpv6(ip: string): number[] | null {
  let value = ip.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  // Handle embedded IPv4 (e.g. ::ffff:127.0.0.1) by converting the dotted
  // suffix into two hextets.
  const lastColon = value.lastIndexOf(":");
  if (lastColon !== -1) {
    const suffix = value.slice(lastColon + 1);
    if (suffix.includes(".")) {
      const v4Int = ipv4ToInt(suffix);
      if (v4Int === null) return null;
      const hi = ((v4Int >>> 16) & 0xffff).toString(16);
      const lo = (v4Int & 0xffff).toString(16);
      value = `${value.slice(0, lastColon)}:${hi}:${lo}`;
    }
  }

  let head: string[] = [];
  let tail: string[] = [];
  const doubleColonIdx = value.indexOf("::");
  if (doubleColonIdx !== -1) {
    // Reject more than one "::"
    if (value.indexOf("::", doubleColonIdx + 1) !== -1) return null;
    const left = value.slice(0, doubleColonIdx);
    const right = value.slice(doubleColonIdx + 2);
    head = left ? left.split(":") : [];
    tail = right ? right.split(":") : [];
  } else {
    head = value.split(":");
  }

  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (doubleColonIdx === -1 && missing !== 0)) return null;

  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  if (groups.length !== 8) return null;

  const hextets: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    hextets.push(parseInt(g, 16));
  }
  return hextets;
}

/** Formats two hextets as the dotted IPv4 address they hold. */
function hextetsToIpv4(hi: number, lo: number): string {
  return `${hi >>> 8}.${hi & 0xff}.${lo >>> 8}.${lo & 0xff}`;
}

function isPrivateIpv6(ip: string): boolean {
  const g = expandIpv6(ip);
  if (g === null) return true;

  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) addresses hold
  // an IPv4 address in the last 32 bits. Unwrap it and re-check. This also
  // covers ::/128 and ::1/128, which unwrap to 0.0.0.0/8.
  if (
    g[0] === 0 &&
    g[1] === 0 &&
    g[2] === 0 &&
    g[3] === 0 &&
    g[4] === 0 &&
    (g[5] === 0xffff || g[5] === 0)
  ) {
    return isPrivateIpv4(hextetsToIpv4(g[6], g[7]));
  }

  // 6to4 (2002::/16) holds an IPv4 address in bits 16-47.
  if (g[0] === 0x2002) {
    return isPrivateIpv4(hextetsToIpv4(g[1], g[2]));
  }

  // fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  if ((g[0] & 0xff00) === 0xff00) return true;

  // 64:ff9b::/96 well-known NAT64 prefix, 64:ff9b:1::/48 local-use NAT64
  // prefix (RFC 8215), 2001:db8::/32 documentation
  if (
    g[0] === 0x64 &&
    g[1] === 0xff9b &&
    g[2] === 0 &&
    g[3] === 0 &&
    g[4] === 0 &&
    g[5] === 0
  ) {
    return true;
  }
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return true;
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;

  return false;
}

/** Exported for unit tests. Callers should use `safeFetch`. */
export function isPrivateIp(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) return isPrivateIpv4(ip);
  if (ip.includes(":")) return isPrivateIpv6(ip);
  // Anything we cannot classify, treat as private (fail closed).
  return true;
}

/** Returns the IP literal if `hostname` is one, else null. */
function ipLiteralFromHostname(hostname: string): string | null {
  if (IPV4_REGEX.test(hostname)) return hostname;
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return null;
}

// DoH response codes. Any other status (SERVFAIL, REFUSED, ...) is a failed lookup.
const DNS_NOERROR = 0;
const DNS_NXDOMAIN = 3;

/**
 * Resolves A and AAAA records. Returns null if either lookup fails, so the
 * caller can fail closed instead of checking only one address family.
 */
async function resolveHostnameToIps(
  hostname: string,
  signal: AbortSignal,
): Promise<string[] | null> {
  const query = async (type: "A" | "AAAA"): Promise<string[] | null> => {
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`,
        { signal },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        Status?: number;
        Answer?: { data: string; type: number }[];
      };
      if (data.Status !== DNS_NOERROR && data.Status !== DNS_NXDOMAIN) {
        return null;
      }
      // Type 1 = A, type 28 = AAAA. Ignore CNAME / other intermediate records.
      const wantedType = type === "A" ? 1 : 28;
      return (data.Answer ?? [])
        .filter((a) => a.type === wantedType)
        .map((a) => a.data);
    } catch {
      return null;
    }
  };

  const [a, aaaa] = await Promise.all([query("A"), query("AAAA")]);
  if (a === null || aaaa === null) return null;
  return [...a, ...aaaa];
}

async function assertUrlIsSafe(url: URL, signal: AbortSignal): Promise<void> {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `URL protocol "${url.protocol}" is not allowed.`,
    });
  }

  const literal = ipLiteralFromHostname(url.hostname);
  if (literal !== null) {
    if (isPrivateIp(literal)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "URL resolves to a disallowed IP address.",
      });
    }
    return;
  }

  const ips = await resolveHostnameToIps(url.hostname, signal);
  if (signal.aborted) {
    throw new Error("Request timed out");
  }
  if (ips === null || ips.length === 0) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Could not resolve hostname: ${url.hostname}`,
    });
  }
  if (ips.some((ip) => isPrivateIp(ip))) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "URL resolves to a disallowed IP address.",
    });
  }
}

type SafeFetchOptions = {
  /** Total timeout across all redirect hops. Defaults to 5000ms. */
  timeoutMs?: number;
  /**
   * Max number of redirects to follow. Defaults to 5. Set to 0 to return a
   * redirect response as is, like `redirect: "manual"`.
   */
  maxRedirects?: number;
};

export async function safeFetch(
  url: string,
  init?: RequestInit,
  opts: SafeFetchOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let currentUrl: URL;
  try {
    currentUrl = new URL(url);
  } catch {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Invalid URL: ${url}`,
    });
  }

  // One deadline covers the DNS checks and the requests of every hop.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchWithRedirects(
      currentUrl,
      init,
      maxRedirects,
      controller.signal,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRedirects(
  url: URL,
  init: RequestInit | undefined,
  maxRedirects: number,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = url;
  let currentInit: RequestInit = { ...init };
  let hops = 0;

  while (true) {
    await assertUrlIsSafe(currentUrl, signal);

    const response = await fetch(currentUrl.toString(), {
      ...currentInit,
      redirect: "manual",
      signal,
    });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location || maxRedirects === 0) {
      return response;
    }

    // We do not read the redirect body, so release its connection.
    await response.body?.cancel().catch(() => {});

    if (hops >= maxRedirects) {
      throw new Error("Too many redirects");
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `Invalid redirect location: ${location}`,
      });
    }

    currentInit = initForRedirect(
      currentInit,
      response.status,
      currentUrl,
      nextUrl,
    );
    currentUrl = nextUrl;
    hops += 1;
  }
}

const REQUEST_BODY_HEADERS = [
  "content-encoding",
  "content-language",
  "content-location",
  "content-type",
];
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization"];

/**
 * Builds the request for the next redirect hop with the rules that `fetch`
 * uses when it follows redirects: 303 (and 301/302 after a POST) switch to a
 * GET without a body, and credentials are not sent to another origin.
 */
function initForRedirect(
  init: RequestInit,
  status: number,
  from: URL,
  to: URL,
): RequestInit {
  const method = (init.method ?? "GET").toUpperCase();
  const switchToGet =
    (status === 303 && method !== "GET" && method !== "HEAD") ||
    ((status === 301 || status === 302) && method === "POST");
  const crossOrigin = from.origin !== to.origin;

  if (!switchToGet && !crossOrigin) return init;

  const headers = new Headers(init.headers);
  if (switchToGet) {
    REQUEST_BODY_HEADERS.forEach((name) => headers.delete(name));
  }
  if (crossOrigin) {
    CREDENTIAL_HEADERS.forEach((name) => headers.delete(name));
  }

  return {
    ...init,
    headers,
    ...(switchToGet && { method: "GET", body: undefined }),
  };
}
