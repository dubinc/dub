import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { saleAnalyticsResponse } from "@/lib/zod/schemas/sales-analytics";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.sequential("GET /analytics?event=sales", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  VALID_ANALYTICS_ENDPOINTS.map((type) => {
    test(`by ${type}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: { event: "sales", type, workspaceId, ...filter },
      });

      const responseSchema =
        type === "count"
          ? saleAnalyticsResponse[type].strict()
          : z.array(saleAnalyticsResponse[type].strict());

      const parsed = responseSchema.safeParse(data);

      expect(status).toEqual(200);
      expect(parsed.success).toBeTruthy();
    });
  });
});
