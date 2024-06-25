import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("DELETE /links/{linkId}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

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
  expect(data).toStrictEqual({
    id: link.id,
  });

  // Re-fetch the link
  const { status: status2 } = await http.get({
    path: `/links/${link.id}`,
    query: { workspaceId },
  });

  expect(status2).toBe(404);
});
