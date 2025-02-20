import { Tag } from "@dub/prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { randomTagName } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

test("GET /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  onTestFinished(async () => {
    await h.deleteTag(tagCreated.id);
  });

  const newTag = {
    tag: randomTagName(),
    color: "red",
  };

  const { data: tagCreated } = await http.post<Tag>({
    path: "/tags",
    body: newTag,
  });

  const { status, data: tags } = await http.get<Tag[]>({
    path: "/tags?sortBy=createdAt&sortOrder=desc",
  });

  expect(status).toEqual(200);
  expect(tags).toEqual(
    expect.arrayContaining([
      {
        id: tagCreated.id,
        name: tagCreated.name,
        color: tagCreated.color,
      },
    ]),
  );
});
