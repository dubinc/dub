import z from "@/lib/zod";
import { partnerAnalyticsResponseSchema } from "@/lib/zod/schemas/partners";
import { env } from "tests/utils/env";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const allowedGroupBy = ["count", "timeseries", "top_links"];
const programId = "prog_CYCu7IMAapjkRpTnr8F1azjN";
const partnerId = "pn_H4TB2V5hDIjpqB7PwrxESoY3";

describe.runIf(env.CI).sequential("GET /partners/analytics", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  allowedGroupBy.map((groupBy) => {
    test(`by ${groupBy}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: `/partners/analytics`,
        query: {
          groupBy,
          event: "composite",
          interval: "30d",
          programId,
          partnerId,
        },
      });

      const responseSchema =
        groupBy === "count"
          ? partnerAnalyticsResponseSchema[groupBy].strict()
          : z.array(partnerAnalyticsResponseSchema[groupBy].strict());

      expect(status).toEqual(200);
      expect(responseSchema.safeParse(data).success).toBeTruthy();
    });
  });
});
