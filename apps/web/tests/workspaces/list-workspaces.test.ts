import { nanoid } from "@dub/utils";
import { Project } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";

test("GET /workspaces", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { apiKey, workspace } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const workspacesToCreate = [
    { name: "Personal", slug: slugify(nanoid(6)) },
    { name: "Work", slug: slugify(nanoid(6)) },
  ];

  await http.post({
    path: "/workspaces",
    body: { ...workspacesToCreate[0] },
  });

  // Fetch the list of workspaces
  const { status, data: workspaces } = await http.get<Project[]>({
    path: "/workspaces",
  });

  expect(status).toEqual(200);
  expect(workspaces).toHaveLength(2);

  expect(workspaces).toMatchObject([
    {
      ...expectedWorkspace,
      name: workspace.name,
      slug: workspace.slug,
      plan: "pro",
      domains: [],
    },
    {
      ...expectedWorkspace,
      ...workspacesToCreate[0],
      users: [{ role: "owner" }],
      domains: [],
    },
  ]);
});
