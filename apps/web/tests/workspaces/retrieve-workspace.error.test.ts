import { Project } from "@dub/prisma";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("retrieve a workspace by invalid slug or id", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const { status, data: error } = await http.get<Project>({
    path: `/workspaces/xxxx`,
  });

  expect(status).toEqual(404);
  expect(error).toStrictEqual({
    error: {
      code: "not_found",
      message: "Workspace not found.",
      doc_url: "https://dub.co/docs/api-reference/errors#not-found",
    },
  });
});
