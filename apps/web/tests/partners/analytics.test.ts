import z from "@/lib/zod";
import { partnerAnalyticsResponseSchema } from "@/lib/zod/schemas/partners";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";

const allowedGroupBy = ["count", "timeseries", "top_links"];

describe.runIf(env.CI).sequential("GET /partners/analytics", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  allowedGroupBy.map((groupBy) => {
    test(`by ${groupBy}`, async () => {
      const { status, data } = await http.get<any[]>({
        path: "/partners/analytics",
        query: {
          groupBy,
          event: "composite",
          interval: "30d",
          programId: E2E_PROGRAM.id,
          partnerId: E2E_PARTNER.id,
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
