import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
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
});
