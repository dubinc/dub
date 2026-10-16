import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` throws on import outside of a Next.js server bundle. Stub it
// so we can import `safe-fetch.ts`, which depends transitively on it via
// `@/lib/api/errors`.
vi.mock("server-only", () => ({}));

vi.mock("node:dns", () => ({ default: { lookup: vi.fn() } }));

import { isPrivateIp } from "@/lib/api/is-private-ip";
import { safeFetch } from "@/lib/api/safe-fetch";
import { safeLookup } from "@/lib/api/safe-fetch-node";
import dns from "node:dns";

describe("isPrivateIp", () => {
  describe("IPv4", () => {
    it.each([
      "0.0.0.0",
      "10.0.0.1",
      "10.255.255.255",
      "100.64.0.1",
      "127.0.0.1",
      "127.255.255.254",
      "169.254.169.254", // AWS / GCP / Azure metadata
      "172.16.0.1",
      "172.31.255.254",
      "192.168.0.1",
      "192.168.1.1",
      "198.18.0.1",
      "224.0.0.1", // multicast
      "240.0.0.1", // reserved
      "255.255.255.255",
    ])("flags %s as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      "1.1.1.1",
      "8.8.8.8",
      "9.9.9.9",
      "11.0.0.1", // just outside 10.0.0.0/8
      "100.63.255.255", // just outside CGNAT
      "172.15.255.255", // just outside 172.16.0.0/12
      "172.32.0.1", // just outside 172.16.0.0/12
      "192.0.1.1", // just outside 192.0.0.0/24
      "192.167.255.255", // just outside 192.168.0.0/16
      "193.0.0.1",
      "223.255.255.255", // just outside multicast
    ])("does not flag %s as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    });
  });

  describe("IPv6", () => {
    it.each([
      "::",
      "::1",
      "fc00::",
      "fc00::1",
      "fd00::1",
      "fdff::ffff",
      "fe80::1",
      "fe80::abcd:1234",
      "ff00::1",
      "ff02::1",
      "64:ff9b::1.2.3.4",
      "2001:db8::1",
      "0:0:0:0:0:0:0:1", // expanded ::1
      "2001:0db8::1", // leading zero in the documentation prefix
    ])("flags %s as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      "::ffff:127.0.0.1", // IPv4-mapped loopback
      "::ffff:10.0.0.1", // IPv4-mapped RFC1918
      "::ffff:169.254.169.254", // IPv4-mapped metadata
      "::ffff:192.168.1.1",
    ])("flags IPv4-mapped %s as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      "::127.0.0.1", // IPv4-compatible loopback
      "::7f00:1", // same address in hex form, as `new URL` writes it
      "::a9fe:a9fe", // IPv4-compatible 169.254.169.254
      "2002:7f00:1::", // 6to4 for 127.0.0.1
      "2002:a9fe:a9fe::1", // 6to4 for 169.254.169.254
      "2002:c0a8:101::", // 6to4 for 192.168.1.1
      "64:ff9b:1::a00:1", // local-use NAT64 prefix
      "64:ff9b:1:ffff::1",
    ])("flags %s with an embedded private IPv4 as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    });

    it.each([
      "2606:4700:4700::1111", // Cloudflare DNS
      "2001:4860:4860::8888", // Google DNS
      "2620:fe::fe", // Quad9
      "::ffff:1.1.1.1", // IPv4-mapped public
      "::ffff:8.8.8.8",
      "2002:808:808::", // 6to4 for 8.8.8.8
      "64:ff9b:2::1", // just outside the local-use NAT64 prefix
    ])("does not flag %s as private", (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    });
  });

  describe("invalid inputs", () => {
    it.each([
      "",
      "not-an-ip",
      "999.999.999.999",
      "256.0.0.1",
      "1.2.3",
      "::gggg",
      ":::1",
    ])("treats %s as private (fail closed)", (value) => {
      expect(isPrivateIp(value)).toBe(true);
    });
  });
});

const PUBLIC_IP = "93.184.216.34";

function dohAnswer(type: "A" | "AAAA", ips: string[]) {
  return Response.json({
    Status: 0,
    Answer: ips.map((data) => ({ data, type: type === "A" ? 1 : 28 })),
  });
}

function redirect(location: string, status = 302) {
  return new Response("redirect body", { status, headers: { location } });
}

describe("safeFetch", () => {
  // Maps hostname to its A records. Hostnames that are not listed get none.
  let aRecords: Record<string, string[]>;
  // Handles the requests that are not DoH lookups.
  let handler: (url: string, init: RequestInit) => Promise<Response>;
  const defaultFetch = async (
    input: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = new URL(input.toString());
    if (url.hostname === "dns.google") {
      const name = url.searchParams.get("name")!;
      const type = url.searchParams.get("type") as "A" | "AAAA";
      return dohAnswer(type, type === "A" ? aRecords[name] ?? [] : []);
    }
    return handler(url.toString(), init);
  };
  const fetchMock = vi.fn(defaultFetch);

  beforeEach(() => {
    aRecords = { "example.com": [PUBLIC_IP], "other.com": [PUBLIC_IP] };
    handler = async () => new Response("ok");
    fetchMock.mockReset();
    fetchMock.mockImplementation(defaultFetch);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the redirect response as is when maxRedirects is 0", async () => {
    handler = async () => redirect("https://example.com/next");

    const res = await safeFetch("https://example.com", undefined, {
      maxRedirects: 0,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/next");
  });

  it("follows a redirect to a public host", async () => {
    handler = async (url) =>
      url === "https://example.com/" ? redirect("/next") : new Response("ok");

    const res = await safeFetch("https://example.com");

    expect(await res.text()).toBe("ok");
  });

  it("rejects a redirect to a private IP literal", async () => {
    handler = async () => redirect("http://169.254.169.254/latest/meta-data");

    await expect(safeFetch("https://example.com")).rejects.toThrow(
      "disallowed IP address",
    );
  });

  it("rejects a hostname that resolves to a private IP", async () => {
    aRecords["internal.example.com"] = [PUBLIC_IP, "10.0.0.1"];

    await expect(safeFetch("https://internal.example.com")).rejects.toThrow(
      "disallowed IP address",
    );
  });

  it("fails closed when one DoH lookup fails", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(input.toString());
      if (url.searchParams.get("type") === "AAAA") {
        return new Response("error", { status: 500 });
      }
      return dohAnswer("A", [PUBLIC_IP]);
    });

    await expect(safeFetch("https://example.com")).rejects.toThrow(
      "Could not resolve hostname",
    );
  });

  it("throws after too many redirects", async () => {
    handler = async () => redirect("https://example.com/loop");

    await expect(
      safeFetch("https://example.com", undefined, { maxRedirects: 2 }),
    ).rejects.toThrow("Too many redirects");
  });

  it("switches to GET without a body after a 303", async () => {
    const seen: RequestInit[] = [];
    handler = async (url, init) => {
      seen.push(init);
      return url === "https://example.com/"
        ? redirect("/done", 303)
        : new Response("ok");
    };

    await safeFetch("https://example.com", {
      method: "POST",
      body: "payload",
      headers: { "content-type": "text/plain" },
    });

    expect(seen[1].method).toBe("GET");
    expect(seen[1].body).toBeUndefined();
    expect(new Headers(seen[1].headers).get("content-type")).toBeNull();
  });

  it("drops credential headers on a cross-origin redirect", async () => {
    const seen: RequestInit[] = [];
    handler = async (url, init) => {
      seen.push(init);
      return url === "https://example.com/"
        ? redirect("https://other.com/")
        : new Response("ok");
    };

    await safeFetch("https://example.com", {
      headers: { authorization: "Bearer token", "x-custom": "kept" },
    });

    const headers = new Headers(seen[1].headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-custom")).toBe("kept");
  });

  it("applies the timeout to the DoH lookups", async () => {
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await expect(
      safeFetch("https://example.com", undefined, { timeoutMs: 50 }),
    ).rejects.toThrow("Request timed out");
  });
});

describe("safeLookup", () => {
  const lookupMock = vi.mocked(dns.lookup) as unknown as ReturnType<
    typeof vi.fn
  >;

  function resolveTo(addresses: { address: string; family: number }[]) {
    lookupMock.mockImplementation((_hostname, _options, callback) =>
      callback(null, addresses),
    );
  }

  function lookup(options: dns.LookupOptions) {
    return new Promise<{ err: Error | null; address: unknown }>((resolve) =>
      safeLookup(
        "example.com",
        options as dns.LookupOneOptions,
        (err, address) => resolve({ err, address }),
      ),
    );
  }

  it("returns the first address for a public host", async () => {
    resolveTo([{ address: PUBLIC_IP, family: 4 }]);

    const { err, address } = await lookup({});

    expect(err).toBeNull();
    expect(address).toBe(PUBLIC_IP);
  });

  it("returns all addresses when called with all: true", async () => {
    const addresses = [
      { address: PUBLIC_IP, family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ];
    resolveTo(addresses);

    const { address } = await lookup({ all: true });

    expect(address).toEqual(addresses);
  });

  it("rejects a host with any private address", async () => {
    resolveTo([
      { address: PUBLIC_IP, family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    const { err } = await lookup({ all: true });

    expect(err?.message).toContain("disallowed IP address");
  });
});
