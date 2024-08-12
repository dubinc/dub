import { Tag } from "@dub/prisma";
import { afterAll, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

test("POST /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const newTag = {
    name: randomId(),
    color: "red",
  };

  const { status, data: tag } = await http.post<Tag>({
    path: "/tags",
    body: newTag,
  });

  expect(status).toEqual(201);
  expect(tag).toStrictEqual({
    id: expect.any(String),
    ...newTag,
  });

  afterAll(async () => {
    await h.deleteTag(tag.id);
  });
});
