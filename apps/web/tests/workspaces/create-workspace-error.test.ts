import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Project } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";

test("should not create workspace with slug in use", async (ctx) => {
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

  // Create a workspace with the same slug
  const { data: workspace } = await http.post<Project>({
    path: "/workspaces",
    body: {
      name,
      slug,
    },
  });

  // Create another workspace with the same slug
  const { status, data: error } = await http.post<Project>({
    path: "/workspaces",
    body: {
      name,
      slug,
    },
  });

  expect(status).toEqual(409);
  expect(error).toEqual({
    error: {
      code: "conflict",
      message: "Slug is already in use.",
      doc_url: "https://dub.co/docs/api-reference/errors#conflict",
    },
  });

  await http.delete({
    path: `/workspaces/ws_${workspace.id}`,
  });
});
