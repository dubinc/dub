import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe
  .runIf(env.CI)
  .sequential("GET /analytics?event=composite", async () => {
    const h = new IntegrationHarness();
    const { workspace, http } = await h.init();
    const workspaceId = workspace.id;

    VALID_ANALYTICS_ENDPOINTS.map((groupBy) => {
      test(`by ${groupBy}`, async () => {
        const { status, data } = await http.get<any[]>({
          path: `/analytics`,
          query: { event: "composite", groupBy, workspaceId, ...filter },
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
