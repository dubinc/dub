import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("GET /links/count", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();
  const { workspaceId } = workspace;

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  await Promise.all([
    http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: { url, domain },
    }),
    http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: { url, domain },
    }),
  ]);

  const { status, data: count } = await http.get<Link[]>({
    path: "/links/count",
    query: { workspaceId },
  });

  expect(status).toEqual(200);
  expect(count).toEqual(2);
});
