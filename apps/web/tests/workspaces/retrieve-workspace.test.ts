import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";

test("GET /workspaces/{id}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: workspaceFetched } = await http.get<Project>({
    path: `/workspaces/${workspace.workspaceId}`,
  });

  expect(status).toEqual(200);
  expect(workspaceFetched).toMatchObject({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    id: `ws_${workspace.id}`,
    plan: "pro",
    domains: [],
    users: [{ role: "owner" }],
  });
});

test("GET /workspaces/{slug}", async (ctx) => {
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

  expect(status).toEqual(200);
  expect(workspaceFetched).toMatchObject({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    id: `ws_${workspace.id}`,
    plan: "pro",
    domains: [],
    users: [{ role: "owner" }],
  });
});
