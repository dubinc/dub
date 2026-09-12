import { describe, expect, it, vi } from "vitest";

// `server-only` throws on import outside of a Next.js server bundle. Stub it
// so we can import `safe-fetch.ts`, which depends transitively on it via
// `@/lib/api/errors`.
vi.mock("server-only", () => ({}));

import { isPrivateIp } from "@/lib/api/safe-fetch";

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
      "2606:4700:4700::1111", // Cloudflare DNS
      "2001:4860:4860::8888", // Google DNS
      "2620:fe::fe", // Quad9
      "::ffff:1.1.1.1", // IPv4-mapped public
      "::ffff:8.8.8.8",
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
