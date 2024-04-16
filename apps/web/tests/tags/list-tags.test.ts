import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("GET /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const tagsToCreate = [
    { tag: "news", color: "red" },
    { tag: "work", color: "green" },
  ];

  for (const { tag, color } of tagsToCreate) {
    await http.post<Tag>({
      path: "/tags",
      query: { workspaceId: workspace.workspaceId },
      body: { tag, color },
    });
  }

  // Fetch the list of tags
  const { status, data: tags } = await http.get<Tag[]>({
    path: "/tags",
    query: { workspaceId: workspace.workspaceId },
  });

  expect(status).toEqual(200);
  expect(tags).toEqual([
    {
      id: expect.any(String),
      name: "news",
      color: "red",
    },
    {
      id: expect.any(String),
      name: "work",
      color: "green",
    },
  ]);
});
