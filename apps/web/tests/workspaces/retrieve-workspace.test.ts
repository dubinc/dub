import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";

test.skip("retrieve a workspace by id", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: workspaceFetched } = await http.get<Project>({
    path: `/workspaces/${workspace.id}`,
  });

  // console.log(workspaceFetched);

  expect(status).toEqual(200);
  expect(workspaceFetched).toEqual({
    ...expectedWorkspace,
    ...workspace,
    domains: [],
    workspaceId: `ws_${workspace.id}`,
  });
});

test("retrieve a workspace by slug", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: workspaceFetched } = await http.get<Project>({
    path: `/workspaces/${workspace.slug}`,
  });

  console.log({ workspaceFetched });
  console.log({ workspace });

  expect(status).toEqual(200);
  expect(workspaceFetched).toEqual({
    // ...expectedWorkspace,
    ...JSON.parse(JSON.stringify(workspace)),
    id: `ws_${workspace.id}`,
    workspaceId: `ws_${workspace.id}`,
    // name: workspace.name,
    // s
    domains: [],
    users: [{ role: "owner" }],
  });
});
