import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedTag } from "../utils/schema";

test("POST /tags", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: tag } = await http.post<Tag>({
    path: "/tags",
    query: { workspaceId: workspace.workspaceId },
    body: {
      tag: "news",
      color: "red",
    },
  });

  expect(status).toEqual(201);
  expect(tag).toEqual({
    ...expectedTag,
    name: "news",
    color: "red",
    projectId: workspace.id,
  });
});
