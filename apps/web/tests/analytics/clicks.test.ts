import {
  DEPRECATED_ANALYTICS_ENDPOINTS,
  VALID_ANALYTICS_ENDPOINTS,
  formatAnalyticsEndpoint,
} from "@/lib/analytics";
import z from "@/lib/zod";
import { getClickAnalyticsResponse } from "@/lib/zod/schemas";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.runIf(env.CI).sequential("GET /analytics/clicks", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  VALID_ANALYTICS_ENDPOINTS.filter(
    (endpoint) => !DEPRECATED_ANALYTICS_ENDPOINTS.includes(endpoint),
  ).map((endpoint) => {
    test(`by ${endpoint}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics/clicks/${endpoint}`,
        query: { workspaceId, ...filter },
      });

      if (endpoint === "count") {
        expect(status).toEqual(200);
        expect(data).toEqual(expect.any(Number));
        expect(data).toBeGreaterThanOrEqual(0);
      } else {
        const parsed = z
          .array(
            getClickAnalyticsResponse[
              formatAnalyticsEndpoint(endpoint, "plural")
            ].strict(),
          )
          .safeParse(data);

        expect(status).toEqual(200);
        expect(data.length).toBeGreaterThanOrEqual(0);
        expect(parsed.success).toBeTruthy();
      }
    });
  });

  // deprecated, backwards compatiblity
  test("deprecated: by count", async () => {
    const { status, data: clicks } = await http.get<number>({
      path: "/analytics/clicks",
      query: { workspaceId, ...filter },
    });

    expect(status).toEqual(200);
    expect(clicks).toEqual(expect.any(Number));
    expect(clicks).toBeGreaterThanOrEqual(0);
  });

  // deprecated, backwards compatiblity
  DEPRECATED_ANALYTICS_ENDPOINTS.map((endpoint) => {
    test(`deprecated: by ${endpoint}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics/${endpoint}`,
        query: { workspaceId, ...filter },
      });

      const parsed = z
        .array(
          getClickAnalyticsResponse[
            formatAnalyticsEndpoint(endpoint, "plural")
          ].strict(),
        )
        .safeParse(data);

      expect(status).toEqual(200);
      expect(data.length).toBeGreaterThanOrEqual(0);
      expect(parsed.success).toBeTruthy();
    });
  });
});
