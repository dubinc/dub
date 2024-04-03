import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

test("creates new link", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: "http://localhost:8888/api",
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const res = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: { url: "https://google.com" },
  });

  expect(res.status).toEqual(200);
  expect(res.data).toMatchObject({
    url: "https://google.com",
    domain: "kiran.localhost",
    shortLink: `https://kiran.localhost/${res.data.key}`,
    archived: false,
    workspaceId: workspace.workspaceId,
    projectId: workspace.id,
  });
});
