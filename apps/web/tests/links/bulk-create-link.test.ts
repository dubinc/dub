import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

test("POST /links/bulk", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();
  const { workspaceId } = workspace;

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const bulkLinks = Array.from({ length: 10 }, () => ({
    url: `https://example.com/${nanoid()}`,
  }));

  const { status, data: links } = await http.post<Link>({
    path: "/links/bulk",
    query: { workspaceId },
    body: bulkLinks,
  });

  expect(status).toEqual(200);
  expect(links).toHaveLength(10);
});
