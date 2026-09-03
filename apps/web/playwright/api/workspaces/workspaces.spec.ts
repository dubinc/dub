import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { expect } from "@playwright/test";
import type { Project } from "@prisma/client";
import * as z from "zod/v4";
import { apiError } from "../../utils";
import { test } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

test("GET /workspaces/{idOrSlug} – by id", async ({ api, workspace }) => {
  const { status, data: workspaceFetched } = await api.get<Project>(
    `/api/workspaces/${workspace.id}`,
  );

  const { id, name, slug } = workspaceFetched;

  expect(status).toEqual(200);
  expect({ id, name, slug }).toStrictEqual({
    id: workspace.id,
    name: TEST_WORKSPACE.workspace.name,
    slug: workspace.slug,
  });

  WorkspaceSchema.extend({
    createdAt: z.string(),
  }).parse(workspaceFetched);
});

test("GET /workspaces/{idOrSlug} – by slug", async ({ api, workspace }) => {
  const { status, data: workspaceFetched } = await api.get<Project>(
    `/api/workspaces/${workspace.slug}`,
  );

  const { id, name, slug } = workspaceFetched;

  expect(status).toEqual(200);
  expect({ id, name, slug }).toStrictEqual({
    id: workspace.id,
    name: TEST_WORKSPACE.workspace.name,
    slug: workspace.slug,
  });

  WorkspaceSchema.extend({
    createdAt: z.string(),
  }).parse(workspaceFetched);
});

test("GET /workspaces/{idOrSlug} – invalid slug or id", async ({ api }) => {
  expect(await api.get(`/api/workspaces/xxxx`)).toEqual(
    apiError({
      code: "not_found",
      message: "Workspace not found.",
    }),
  );
});
