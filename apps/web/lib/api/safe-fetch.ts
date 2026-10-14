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
 * `safeFetch` uses DoH because the Edge runtime has no `node:dns`. The DoH
 * check and the connect use separate lookups, so a DNS server that answers
 * differently each time can still pass it. On the Node runtime, use
 * `safeFetchNode` from `safe-fetch-node.ts`, which checks the IPs at connect time.
 */

import { DubApiError } from "@/lib/api/errors";
import { IPV4_REGEX, isPrivateIp } from "@/lib/api/is-private-ip";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REDIRECTS = 5;

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

async function assertUrlIsSafe(
  url: URL,
  signal: AbortSignal,
  resolveHostnames: boolean,
): Promise<void> {
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

  // The transport checks the resolved IPs itself when it connects.
  if (!resolveHostnames) return;

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

type SafeFetchTransport = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  /**
   * False when `fetch` checks every resolved IP at connect time, so the DoH
   * check is not needed. IP literals are always checked here, because no DNS
   * lookup runs for them.
   */
  resolveHostnames: boolean;
};

export type SafeFetch = (
  url: string,
  init?: RequestInit,
  opts?: SafeFetchOptions,
) => Promise<Response>;

/** Builds a `safeFetch` on top of another transport. Used by `safeFetchNode`. */
export function createSafeFetch(transport: SafeFetchTransport): SafeFetch {
  return (url, init, opts) => safeFetchWith(transport, url, init, opts);
}

export const safeFetch = createSafeFetch({
  fetch: (url, init) => fetch(url, init),
  resolveHostnames: true,
});

async function safeFetchWith(
  transport: SafeFetchTransport,
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
      transport,
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
  transport: SafeFetchTransport,
  url: URL,
  init: RequestInit | undefined,
  maxRedirects: number,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = url;
  let currentInit: RequestInit = { ...init };
  let hops = 0;

  while (true) {
    await assertUrlIsSafe(currentUrl, signal, transport.resolveHostnames);

    const response = await transport.fetch(currentUrl.toString(), {
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
