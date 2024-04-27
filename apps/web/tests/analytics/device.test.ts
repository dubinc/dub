import z from "@/lib/zod";
import { analyticsResponseSchema } from "@/lib/zod/schemas";
import { expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

test.runIf(env.CI)("GET /analytics/device", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const { status, data } = await http.get<any[]>({
    path: "/analytics/device",
    query: { workspaceId },
  });

  expect(status).toEqual(200);
  expect(data.length).toBeGreaterThanOrEqual(0);
  expect(
    z.array(analyticsResponseSchema["device"].strict()).safeParse(data),
  ).toBeTruthy();
});
