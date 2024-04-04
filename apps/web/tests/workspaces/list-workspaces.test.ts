import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Project } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "@dub/utils";

test("retrieve list of workspaces", async (ctx) => {
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

  await Promise.allSettled(
    workspacesToCreate.map(({ name, slug }) =>
      http.post({
        path: "/workspaces",
        body: { name, slug },
      }),
    ),
  );

  // Fetch the list of workspaces
  const { status, data: workspaces } = await http.get<Project[]>({
    path: "/workspaces",
  });

  expect(status).toEqual(200);
  expect(workspaces.length).equal(3);

  expect(workspaces).toContainEqual({
    ...expectedWorkspace,
    name: workspace.name,
    slug: workspace.slug,
    plan: "pro",
    users: [{ role: "owner" }],
  });

  expect(workspaces).toContainEqual({
    ...expectedWorkspace,
    ...workspacesToCreate[0],
    users: [{ role: "owner" }],
  });

  expect(workspaces).toContainEqual({
    ...expectedWorkspace,
    ...workspacesToCreate[1],
    users: [{ role: "owner" }],
  });

  // Delete the workspaces
  await Promise.allSettled(
    workspaces.map((w) =>
      http.delete({
        path: `/workspaces/ws_${w.id}`,
      }),
    ),
  );
});
