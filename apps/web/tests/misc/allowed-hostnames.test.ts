import { describe, expect, it } from "vitest";
import { verifyAnalyticsAllowedHostnames } from "../../lib/analytics/verify-analytics-allowed-hostnames";

describe("analytics allowed hostnames", () => {
  const createMockRequest = (referer: string | null) => {
    const headers = new Headers();
    if (referer) {
      headers.set("referer", referer);
    }
    return { headers } as Request;
  };

  describe("wildcard subdomain pattern (*.example.com)", () => {
    const allowedHostnames = ["*.example.com"];

    it("should allow subdomain traffic", () => {
      const testCases = [
        "https://app.example.com",
        "https://sub.sub.example.com",
      ];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(true);
      });
    });

    it("should deny root domain traffic", () => {
      const testCases = ["https://example.com"];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(false);
      });
    });

    it("should deny traffic from other domains", () => {
      const testCases = [
        "https://otherdomain.com",
        "https://blog.otherdomain.com",
        "https://example.com.evil.com",
        "https://testexample.com",
      ];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(false);
      });
    });
  });

  describe("root domain pattern (example.com)", () => {
    const allowedHostnames = ["example.com"];

    it("should allow root domain traffic", () => {
      const testCases = ["https://example.com"];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(true);
      });
    });

    it("should deny subdomain traffic", () => {
      const testCases = ["https://app.example.com"];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(false);
      });
    });
  });

  describe("combined patterns (example.com and *.example.com)", () => {
    const allowedHostnames = ["example.com", "*.example.com"];

    it("should allow both root domain and subdomain traffic", () => {
      const testCases = [
        "https://example.com",
        "https://app.example.com",
        "https://sub.sub.example.com",
      ];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(true);
      });
    });

    it("should deny traffic from other domains", () => {
      const testCases = [
        "https://otherdomain.com",
        "https://blog.otherdomain.com",
        "https://example.com.evil.com",
        "https://testexample.com",
      ];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames,
          req,
        });
        expect(result).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle requests without referer or origin", () => {
      const req = createMockRequest(null);
      const result = verifyAnalyticsAllowedHostnames({
        allowedHostnames: ["example.com"],
        req,
      });
      expect(result).toBe(false);
    });

    it("should allow all traffic when no hostnames are specified", () => {
      const testCases = [
        "https://example.com",
        "https://blog.example.com",
        "https://otherdomain.com",
      ];

      testCases.forEach((referer) => {
        const req = createMockRequest(referer);
        const result = verifyAnalyticsAllowedHostnames({
          allowedHostnames: [],
          req,
        });
        expect(result).toBe(true);
      });
    });
  });
});
