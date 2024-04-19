import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { expectedTag } from "../utils/schema";

test("POST /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const { status, data: tag } = await http.post<Tag>({
    path: "/tags",
    query: { workspaceId },
    body: {
      tag: "social",
      color: "red",
    },
  });

  expect(status).toEqual(201);
  expect(tag).toStrictEqual({
    ...expectedTag,
    name: "social",
    color: "red",
    projectId: workspaceId.replace("ws_", ""),
  });

  await h.deleteTag(tag.id);
});
