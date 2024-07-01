import { Tag } from "@prisma/client";
import { afterAll, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("POST /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const { status, data: tag } = await http.post<Tag>({
    path: "/tags",
    body: {
      tag: "social",
      color: "red",
    },
  });

  expect(status).toEqual(201);
  expect(tag).toStrictEqual({
    id: expect.any(String),
    name: "social",
    color: "red",
  });

  afterAll(async () => {
    await h.deleteTag(tag.id);
  });
});
