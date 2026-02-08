import { isIpInRange } from "@/lib/middleware/utils/is-ip-in-range";
import { describe, expect, it } from "vitest";

describe("CIDR Range Checking", () => {
  describe("isIpInRange", () => {
    it("should return true for IPs in the range", () => {
      // Test with /24 range (256 IPs)
      expect(isIpInRange("159.148.128.0", "159.148.128.0/24")).toBe(true);
      expect(isIpInRange("159.148.128.1", "159.148.128.0/24")).toBe(true);
      expect(isIpInRange("159.148.128.255", "159.148.128.0/24")).toBe(true);

      // Test with /16 range (65,536 IPs)
      expect(isIpInRange("159.148.0.0", "159.148.0.0/16")).toBe(true);
      expect(isIpInRange("159.148.255.255", "159.148.0.0/16")).toBe(true);
    });

    it("should return false for IPs outside the range", () => {
      // Test with /24 range
      expect(isIpInRange("159.148.127.255", "159.148.128.0/24")).toBe(false);
      expect(isIpInRange("159.148.129.0", "159.148.128.0/24")).toBe(false);

      // Test with /16 range
      expect(isIpInRange("159.147.255.255", "159.148.0.0/16")).toBe(false);
      expect(isIpInRange("159.149.0.0", "159.148.0.0/16")).toBe(false);
    });

    it("should handle different CIDR prefix lengths", () => {
      // Test with /32 (single IP)
      expect(isIpInRange("192.168.1.1", "192.168.1.1/32")).toBe(true);
      expect(isIpInRange("192.168.1.2", "192.168.1.1/32")).toBe(false);

      // Test with /8 (16,777,216 IPs)
      expect(isIpInRange("10.0.0.0", "10.0.0.0/8")).toBe(true);
      expect(isIpInRange("10.255.255.255", "10.0.0.0/8")).toBe(true);
      expect(isIpInRange("11.0.0.0", "10.0.0.0/8")).toBe(false);
    });

    it("should handle edge cases", () => {
      // Test with 0.0.0.0
      expect(isIpInRange("0.0.0.0", "0.0.0.0/0")).toBe(true);
      expect(isIpInRange("255.255.255.255", "0.0.0.0/0")).toBe(true);

      // Test with invalid inputs
      expect(isIpInRange("invalid-ip", "159.148.128.0/24")).toBe(false);
      expect(isIpInRange("159.148.128.0", "invalid-cidr")).toBe(false);
    });
  });
});
