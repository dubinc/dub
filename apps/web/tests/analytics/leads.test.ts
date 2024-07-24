import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { leadAnalyticsResponse } from "@/lib/zod/schemas/leads-analytics";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.runIf(env.CI).sequential("GET /analytics?event=leads", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const workspaceId = workspace.id;

  VALID_ANALYTICS_ENDPOINTS.map((groupBy) => {
    test(`by ${groupBy}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: { event: "leads", groupBy, workspaceId, ...filter },
      });

      const responseSchema =
        groupBy === "count"
          ? leadAnalyticsResponse[groupBy].strict()
          : z.array(leadAnalyticsResponse[groupBy].strict());

      const parsed = responseSchema.safeParse(data);

      expect(status).toEqual(200);
      expect(parsed.success).toBeTruthy();
    });
  });
});
