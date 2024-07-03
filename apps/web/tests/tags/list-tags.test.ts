import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

test("GET /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const newTag = {
    tag: randomId(),
    color: "red",
  };

  const { data: tagCreated } = await http.post<Tag>({
    path: "/tags",
    body: newTag,
  });

  const { status, data: tags } = await http.get<Tag[]>({
    path: "/tags",
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

  await h.deleteTag(tagCreated.id);
});
