import z from "@/lib/zod";
import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("GET /workspaces", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();

  const { status, data: workspaces } = await http.get<Project[]>({
    path: "/workspaces",
  });

  const workspacesFetched = workspaces.map((w) => {
    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
    };
  });

  expect(status).toEqual(200);
  expect(workspaces.length).toBeGreaterThanOrEqual(1);
  expect(workspacesFetched).toContainEqual({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
  });

  z.array(WorkspaceSchema.extend({ createdAt: z.string() }).strict()).parse(
    workspaces,
  );
});
