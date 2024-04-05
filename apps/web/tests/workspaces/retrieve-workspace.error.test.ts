import { Project } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

// TODO:
// Retrieve workspace not owned by current user

test("retrieve a workspace by invalid slug or id", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { status, data: error } = await http.get<Project>({
    path: `/workspaces/xxxx`,
  });

  expect(status).toEqual(404);
  // Add error
});