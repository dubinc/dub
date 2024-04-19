import { Project } from "@prisma/client";
import { expectedWorkspace } from "tests/utils/schema";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("GET /workspaces", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();

  const { status, data: workspaces } = await http.get<Project[]>({
    path: "/workspaces",
  });

  const workspaceFound = workspaces.find(
    (w) => w.slug === h.resources.workspace.slug,
  );

  expect(status).toEqual(200);
  expect(workspaces.length).toBeGreaterThanOrEqual(1);
  expect(workspaceFound).toStrictEqual({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    id: workspace.id,
    plan: "pro",
    domains: [],
    users: [{ role: "owner" }],
  });
});
