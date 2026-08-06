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
 */

import { DubApiError } from "@/lib/api/errors";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REDIRECTS = 5;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const BIG_ZERO = BigInt(0);
const BIG_16 = BigInt(16);
const BIG_32 = BigInt(32);
const BIG_FFFF = BigInt(0xffff);
const BIG_FFFFFFFF = BigInt(0xffffffff);

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

const PRIVATE_IPV6_CIDRS = [
  "::/128", // unspecified
  "::1/128", // loopback
  "fc00::/7", // unique local
  "fe80::/10", // link-local
  "ff00::/8", // multicast
  "64:ff9b::/96", // IPv4/IPv6 translation
  "2001:db8::/32", // documentation
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

/** Expand an IPv6 string (possibly with embedded IPv4) to a 128-bit bigint. */
function ipv6ToBigInt(ip: string): bigint | null {
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

  let result = BIG_ZERO;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    result = (result << BIG_16) | BigInt(parseInt(g, 16));
  }
  return result;
}

function ipv6InCidr(ipBig: bigint, cidr: string): boolean {
  const [rangeIp, prefix] = cidr.split("/");
  const prefixLen = parseInt(prefix, 10);
  const rangeBig = ipv6ToBigInt(rangeIp);
  if (rangeBig === null || prefixLen < 0 || prefixLen > 128) return false;
  if (prefixLen === 0) return true;
  const shift = BigInt(128 - prefixLen);
  return ipBig >> shift === rangeBig >> shift;
}

function isPrivateIpv6(ip: string): boolean {
  const ipBig = ipv6ToBigInt(ip);
  if (ipBig === null) return true;

  // IPv4-mapped IPv6 (::ffff:0:0/96): unwrap the last 32 bits and re-check.
  if (ipBig >> BIG_32 === BIG_FFFF) {
    const v4Int = Number(ipBig & BIG_FFFFFFFF);
    const v4Str = `${(v4Int >>> 24) & 0xff}.${(v4Int >>> 16) & 0xff}.${
      (v4Int >>> 8) & 0xff
    }.${v4Int & 0xff}`;
    return isPrivateIpv4(v4Str);
  }

  return PRIVATE_IPV6_CIDRS.some((c) => ipv6InCidr(ipBig, c));
}

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

async function resolveHostnameToIps(hostname: string): Promise<string[]> {
  const query = async (type: "A" | "AAAA"): Promise<string[]> => {
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`,
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        Answer?: { data: string; type: number }[];
      };
      // Type 1 = A, type 28 = AAAA. Ignore CNAME / other intermediate records.
      const wantedType = type === "A" ? 1 : 28;
      return (data.Answer ?? [])
        .filter((a) => a.type === wantedType)
        .map((a) => a.data);
    } catch {
      return [];
    }
  };

  const [a, aaaa] = await Promise.all([query("A"), query("AAAA")]);
  return [...a, ...aaaa];
}

async function assertUrlIsSafe(url: URL): Promise<void> {
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

  const ips = await resolveHostnameToIps(url.hostname);
  if (ips.length === 0) {
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
  /** Max number of redirects to follow. Defaults to 5. Set to 0 to disable. */
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

  const deadline = Date.now() + timeoutMs;
  let hops = 0;

  while (true) {
    await assertUrlIsSafe(currentUrl);

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error("Request timed out");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) {
      return response;
    }

    if (hops >= maxRedirects) {
      throw new Error("Too many redirects");
    }

    try {
      currentUrl = new URL(location, currentUrl);
    } catch {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `Invalid redirect location: ${location}`,
      });
    }
    hops += 1;
  }
}
