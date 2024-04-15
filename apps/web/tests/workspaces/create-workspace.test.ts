import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Project } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { expectedWorkspace } from "../utils/schema";

test("creates new workspace", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const name = "Dub Workspace";
  const slug = slugify(`dub-${nanoid()}`);

  const { status, data: workspace } = await http.post<Project>({
    path: "/workspaces",
    body: {
      name,
      slug,
    },
  });

  expect(status).toEqual(200);
  expect(workspace).toEqual({
    ...expectedWorkspace,
    name,
    slug,
    domains: [],
    users: [{ role: "owner" }],
  });
});
