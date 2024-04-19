import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("GET /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const tagsToCreate = [
    { tag: "news", color: "red" },
    { tag: "work", color: "green" },
  ];

  for (const { tag, color } of tagsToCreate) {
    await http.post<Tag>({
      path: "/tags",
      query: { workspaceId },
      body: { tag, color },
    });
  }

  // Fetch the list of tags
  const { status, data: tags } = await http.get<Tag[]>({
    path: "/tags",
    query: { workspaceId },
  });

  expect(status).toEqual(200);
  expect(tags).toStrictEqual([
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

  await Promise.all(tags.map((tag) => h.deleteTag(tag.id)));
});
