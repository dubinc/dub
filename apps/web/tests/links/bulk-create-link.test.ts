import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

test("POST /links/bulk", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${nanoid()}`,
  }));

  const { status, data: links } = await http.post<Link>({
    path: "/links/bulk",
    query: { workspaceId },
    body: bulkLinks,
  });

  expect(status).toEqual(200);
  expect(links).toHaveLength(2);

  await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
});
