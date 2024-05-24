import {
  DEPRECATED_ANALYTICS_ENDPOINTS,
  VALID_ANALYTICS_ENDPOINTS,
} from "@/lib/analytics/constants";
import { formatAnalyticsEndpoint } from "@/lib/analytics/utils";
import z from "@/lib/zod";
import { saleAnalyticsResponse } from "@/lib/zod/schemas/sales-analytics";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.skip.sequential("GET /analytics/sales", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  VALID_ANALYTICS_ENDPOINTS.filter(
    (endpoint) => !DEPRECATED_ANALYTICS_ENDPOINTS.includes(endpoint),
  ).map((endpoint) => {
    test(`by ${endpoint}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics/sales/${endpoint}`,
        query: { workspaceId, ...filter },
      });

      const schema = formatAnalyticsEndpoint(endpoint, "plural");

      expect(status).toEqual(200);

      if (endpoint === "count") {
        const parsed = saleAnalyticsResponse[schema].strict().safeParse(data);
        expect(parsed.success).toBeTruthy();
        return;
      }

      const parsed = z
        .array(saleAnalyticsResponse[schema].strict())
        .safeParse(data);

      expect(data.length).toBeGreaterThanOrEqual(0);
      expect(parsed.success).toBeTruthy();
    });
  });
});
