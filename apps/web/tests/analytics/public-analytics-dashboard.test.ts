import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { E2E_PUBLIC_ANALYTICS_FOLDER_ID } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

describe.runIf(env.CI).sequential("GET /analytics/dashboard", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("public analytics dashboard (folder)", async () => {
    const { status, data } = await http.get<any[]>({
      path: "/analytics/dashboard",
      query: {
        event: "clicks",
        groupBy: "top_links",
        folderId: E2E_PUBLIC_ANALYTICS_FOLDER_ID,
      },
    });

    expect(status).toEqual(200);
    const parsed = z
      .array(analyticsResponse.top_links.strict())
      .safeParse(data);
    expect(parsed.success).toBeTruthy();
    expect(
      parsed.data?.every(
        (item) => item.folderId === E2E_PUBLIC_ANALYTICS_FOLDER_ID,
      ),
    ).toBe(true);
  });
});
