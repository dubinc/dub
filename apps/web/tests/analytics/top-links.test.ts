import z from "@/lib/zod";
import { analyticsResponseSchema } from "@/lib/zod/schemas";
import { expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";
import { filter } from "./utils";

test.runIf(env.CI)("GET /analytics/top_links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const { status, data } = await http.get<any[]>({
    path: "/analytics/top_links",
    query: { workspaceId, ...filter },
  });

  expect(status).toEqual(200);
  expect(data.length).toBeGreaterThanOrEqual(0);
  expect(
    z.array(analyticsResponseSchema["topLinks"].strict()).safeParse(data),
  ).toBeTruthy();
});
