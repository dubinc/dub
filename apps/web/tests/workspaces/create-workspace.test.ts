import { Project } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import { expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { expectedWorkspace } from "../utils/schema";

// Not running this test now
test.skip("POST /workspaces", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const name = "Dub Workspace";
  const slug = slugify(`dub-${randomId()}`);

  const { status, data: workspace } = await http.post<Project>({
    path: "/workspaces",
    body: {
      name,
      slug,
    },
  });

  expect(status).toEqual(200);
  expect(workspace).toStrictEqual({
    ...expectedWorkspace,
    name,
    slug,
    domains: [],
    users: [{ role: "owner" }],
  });
});
