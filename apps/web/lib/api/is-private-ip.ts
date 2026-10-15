/**
 * Deny-list of private, loopback, link-local, cloud-metadata, multicast and
 * reserved IP ranges, shared by `safeFetch`, `safeFetchNode` and `Storage`.
 *
 * This module has no imports, so Node scripts can use it without the
 * `server-only` guard that `@/lib/api/errors` brings in.
 */

export const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

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

export function isPrivateIp(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) return isPrivateIpv4(ip);
  if (ip.includes(":")) return isPrivateIpv6(ip);
  // Anything we cannot classify, treat as private (fail closed).
  return true;
}
