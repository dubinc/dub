import z from "@/lib/zod";
import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { Project } from "@dub/prisma";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("GET /workspaces/{idOrSlug}", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();

  test("by id", async () => {
    const { status, data: workspaceFetched } = await http.get<Project>({
      path: `/workspaces/${workspace.id}`,
    });

    const { id, name, slug } = workspaceFetched;

    expect(status).toEqual(200);
    expect({ id, name, slug }).toStrictEqual({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    });

    WorkspaceSchema.extend({ createdAt: z.string() })
      .strict()
      .parse(workspaceFetched);
  });

  test("by slug", async () => {
    const { status, data: workspaceFetched } = await http.get<Project>({
      path: `/workspaces/${workspace.slug}`,
    });

    const { id, name, slug } = workspaceFetched;

    expect(status).toEqual(200);
    expect({ id, name, slug }).toStrictEqual({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    });

    WorkspaceSchema.extend({ createdAt: z.string() })
      .strict()
      .parse(workspaceFetched);
  });
});
