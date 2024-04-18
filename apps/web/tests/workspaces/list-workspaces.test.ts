import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("GET /workspaces", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: workspaces } = await http.get<Project[]>({
    path: "/workspaces",
  });

  expect(status).toEqual(200);
  expect(workspaces.length).greaterThanOrEqual(1);
  // expect(workspaces).toMatchObject([
  //   {
  //     ...expectedWorkspace,
  //     name: workspace.name,
  //     slug: workspace.slug,
  //     plan: "pro",
  //     domains: [],
  //   },
  // ]);
});
