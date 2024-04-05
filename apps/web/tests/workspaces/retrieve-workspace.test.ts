import { Project } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("retrieve a workspace by id", async (ctx) => {
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

  expect(status).toEqual(200);
  expect(workspaceFetched).toEqual({
    workspace,
    domains: [],
  })
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

  expect(status).toEqual(200);
  expect(workspaceFetched).toEqual({
    workspace,
    domains: [],
  })
});