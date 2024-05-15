import { VALID_TINYBIRD_ENDPOINTS } from "@/lib/analytics";
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

  test("clicks count", async () => {
    const { status, data: clicks } = await http.get<number>({
      path: "/analytics/clicks",
      query: { workspaceId, ...filter },
    });

    expect(status).toEqual(200);
    expect(clicks).toEqual(expect.any(Number));
    expect(clicks).toBeGreaterThanOrEqual(0);
  });

  VALID_TINYBIRD_ENDPOINTS.map((endpoint) => {
    test(`by ${endpoint}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics/clicks/${endpoint}`,
        query: { workspaceId, ...filter },
      });

      const parsed = z
        .array(getClickAnalyticsResponse[endpoint].strict())
        .safeParse(data);

      expect(status).toEqual(200);
      expect(data.length).toBeGreaterThanOrEqual(0);
      expect(parsed.success).toBeTruthy();
    });
  });

  // deprecated, backwards compatiblity
  VALID_TINYBIRD_ENDPOINTS.map((endpoint) => {
    test(`by ${endpoint}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics/${endpoint}`,
        query: { workspaceId, ...filter },
      });

      const parsed = z
        .array(getClickAnalyticsResponse[endpoint].strict())
        .safeParse(data);

      expect(status).toEqual(200);
      expect(data.length).toBeGreaterThanOrEqual(0);
      expect(parsed.success).toBeTruthy();
    });
  });
});
