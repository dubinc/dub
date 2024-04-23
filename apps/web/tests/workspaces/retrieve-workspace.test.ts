import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";

test.skip("GET /workspaces/{id}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();

  const { status, data: workspaceFetched } = await http.get<Project>({
    path: `/workspaces/${workspace.workspaceId}`,
  });

  expect(status).toEqual(200);
  expect(workspaceFetched).toMatchObject({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    id: workspace.id,
    domains: [],
    users: [{ role: "owner" }],
  });
});

test.skip("GET /workspaces/{slug}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();

  const { status, data: workspaceFetched } = await http.get<Project>({
    path: `/workspaces/${workspace.slug}`,
  });

  expect(status).toEqual(200);
  expect(workspaceFetched).toStrictEqual({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    id: workspace.id,
    domains: [],
    users: [{ role: "owner" }],
  });
});
