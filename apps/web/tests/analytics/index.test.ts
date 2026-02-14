import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import {
  E2E_PARTNER,
  E2E_PARTNERS,
  E2E_PARTNER_GROUP,
} from "../utils/resource";

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

  describe("partnerId Filters", () => {
    test("single partnerId filter (count)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("multiple partnerIds filter (IS ONE OF)", async () => {
      const partnerIds = E2E_PARTNERS.map((p) => p.id).join(",");
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: partnerIds,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("exclude partnerId (IS NOT)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: `-${E2E_PARTNER.id}`,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("exclude multiple partnerIds (IS NOT ONE OF)", async () => {
      const partnerIds = E2E_PARTNERS.map((p) => p.id).join(",");
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: `-${partnerIds}`,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("partnerId with timeseries groupBy", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "timeseries",
          workspaceId,
          interval: "30d",
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("partnerId with top_links groupBy", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "top_links",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("partnerId combined with country filter", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });

    test("backward compatibility - single partnerId still works", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "all",
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });
  });

  describe("groupId Filters", () => {
    test("single groupId filter (count)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          groupId: E2E_PARTNER_GROUP.id,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("exclude groupId (IS NOT)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          groupId: `-${E2E_PARTNER_GROUP.id}`,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("groupId with timeseries groupBy", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "timeseries",
          workspaceId,
          interval: "30d",
          groupId: E2E_PARTNER_GROUP.id,
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("groupId combined with partnerId filter", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "all",
          groupId: E2E_PARTNER_GROUP.id,
          partnerId: E2E_PARTNER.id,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });

    test("backward compatibility - single groupId still works", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "all",
          groupId: E2E_PARTNER_GROUP.id,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });
  });

  describe("tenantId Filters", () => {
    test("single tenantId filter (count)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          tenantId: E2E_PARTNER.tenantId,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("exclude tenantId (IS NOT)", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "composite",
          groupBy: "count",
          workspaceId,
          interval: "all",
          tenantId: `-${E2E_PARTNER.tenantId}`,
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
      expect(data).toHaveProperty("leads");
      expect(data).toHaveProperty("sales");
    });

    test("tenantId with timeseries groupBy", async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "timeseries",
          workspaceId,
          interval: "30d",
          tenantId: E2E_PARTNER.tenantId,
        },
      });

      expect(status).toEqual(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("tenantId combined with country filter", async () => {
      const { status, data } = await http.get<any>({
        path: `/analytics`,
        query: {
          event: "clicks",
          groupBy: "count",
          workspaceId,
          interval: "all",
          tenantId: E2E_PARTNER.tenantId,
          country: "US",
        },
      });

      expect(status).toEqual(200);
      expect(data).toHaveProperty("clicks");
    });
  });
});
