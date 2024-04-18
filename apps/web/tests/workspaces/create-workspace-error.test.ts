import { Project } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("should not create workspace with slug in use", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { apiKey, workspace } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  console.log("existing workspace", workspace);

  // Create another workspace with the same slug
  const { status, data: error } = await http.post<Project>({
    path: "/workspaces",
    body: {
      name: "Dub Workspace",
      slug: workspace.slug,
    },
  });

  console.log("error", error);
  console.log("status", status);

  expect(status).toEqual(409);
  expect(error).toEqual({
    error: {
      code: "conflict",
      message: "Slug is already in use.",
      doc_url: "https://dub.co/docs/api-reference/errors#conflict",
    },
  });
});
