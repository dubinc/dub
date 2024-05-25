import { VALID_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import z from "@/lib/zod";
import { leadAnalyticsResponse } from "@/lib/zod/schemas/leads-analytics";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

describe.sequential("GET /analytics?event=leads", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  VALID_ANALYTICS_ENDPOINTS.map((type) => {
    test(`by ${type}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/analytics`,
        query: { event: "leads", type, workspaceId, ...filter },
      });

      const responseSchema =
        type === "count"
          ? z.number()
          : z.array(leadAnalyticsResponse[type].strict());

      const parsed = responseSchema.safeParse(data);

      expect(status).toEqual(200);
      expect(parsed.success).toBeTruthy();
    });
  });
});
