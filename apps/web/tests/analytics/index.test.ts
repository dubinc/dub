import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

describe.runIf(env.CI).sequential("GET /analytics", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const workspaceId = workspace.id;

  VALID_ANALYTICS_ENDPOINTS.map((groupBy) => {
    test(`by ${groupBy}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy,
          workspaceId,
          interval: "30d",
          ...(groupBy !== "top_partners"
            ? {
                domain: "dub.sh",
                key: "checkly-check",
              }
            : {}),
        },
      });

      const responseSchema =
        groupBy === "count"
          ? analyticsResponse[groupBy].strict()
          : z.array(analyticsResponse[groupBy].strict());

      const parsed = responseSchema.safeParse(data);

      expect(status).toEqual(200);
      expect(parsed.success).toBeTruthy();
    });
  });

  test("filter events by metadata.productId", async () => {
    const { status, data } = await http.get<any[]>({
      path: `/events`,
      query: {
        event: "sales",
        workspaceId,
        interval: "30d",
        query: "metadata['productId']:premiumProductId",
      },
    });

    expect(status).toEqual(200);

    // check to make sure all events have metadata.productId equal to premiumProductId
    expect(
      data.every((event) => event.metadata?.productId === "premiumProductId"),
    ).toBe(true);
  });

  describe("Advanced Filters", () => {
    test("single country filter", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });

    test("multiple countries filter (IS ONE OF)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "countries",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US,CA,GB",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
      
      // All returned countries should be in the filter
      data.forEach((item: any) => {
        expect(["US", "CA", "GB"]).toContain(item.country);
      });
    });

    test("exclude country (IS NOT)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "countries",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "-US",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
      
      // No country should be US
      data.forEach((item: any) => {
        expect(item.country).not.toBe("US");
      });
    });

    test("exclude multiple countries (IS NOT ONE OF)", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "countries",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "-US,GB",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
      
      // No country should be US or GB
      data.forEach((item: any) => {
        expect(["US", "GB"]).not.toContain(item.country);
      });
    });

    test("multiple devices filter", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "devices",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          device: "mobile,desktop",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
      
      // All returned devices should be in the filter
      data.forEach((item: any) => {
        expect(["Mobile", "Desktop"]).toContain(item.device);
      });
    });

    test("country AND device filters combined", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
          device: "desktop",
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      // Should return clicks that are both from US AND desktop
    });

    test("timeseries with country filter", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "timeseries",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
      // Timeseries should only include US data
    });

    test("backward compatibility - old format still works", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "30d",
          domain: "dub.sh",
          key: "checkly-check",
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      // Old single-value format should still work
    });
  });
});
