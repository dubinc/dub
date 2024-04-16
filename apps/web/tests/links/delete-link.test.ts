import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("DELETE /links/{linkId}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();
  const { workspaceId } = workspace;

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const { data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId },
    body: {
      url,
      domain,
    },
  });

  const { status, data } = await http.delete({
    path: `/links/${link.id}`,
    query: { workspaceId },
  });

  expect(status).toBe(200);
  expect(data).toMatchObject({
    id: link.id,
  });

  // Re-fetch the link
  const { status: status2 } = await http.get({
    path: "/links",
    query: {
      workspaceId,
      domain,
      key: link.key,
    },
  });

  expect(status2).toBe(404);
});
