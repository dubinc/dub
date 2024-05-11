import z from "@/lib/zod";
import { getClickAnalyticsResponse } from "@/lib/zod/schemas";
import { expect, test } from "vitest";
import { env } from "../../utils/env";
import { IntegrationHarness } from "../../utils/integration";
import { filter } from "../utils";

test.runIf(env.CI)("GET /analytics/browser", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const { status, data } = await http.get<any[]>({
    path: "/analytics/browser",
    query: { workspaceId, ...filter },
  });

  const parsed = z
    .array(getClickAnalyticsResponse["browser"].strict())
    .safeParse(data);

  expect(status).toEqual(200);
  expect(data.length).toBeGreaterThanOrEqual(0);
  expect(parsed.success).toBeTruthy();
});
