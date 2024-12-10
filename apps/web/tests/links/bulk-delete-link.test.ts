import { Link } from "@dub/prisma/client";
import { expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain } = E2E_LINK;

test("DELETE /links/bulk", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
  }));

  const { data: links } = await http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  const linkIds = links.map((l) => l.id);
  linkIds.push("some-random-id-that-does-not-exist");

  const { status, data } = await http.delete<{
    deletedCount: number;
  }>({
    path: "/links/bulk",
    query: {
      linkIds: linkIds.join(","),
    },
  });

  expect(status).toEqual(200);
  expect(data.deletedCount).toEqual(2);

  // Verify that the links are deleted
  const fetchedLinks = await Promise.all(
    linkIds.map((id) => http.get<Link>({ path: `/links/${id}` })),
  );

  expect(fetchedLinks.every((l) => l.status === 404)).toBeTruthy();
});
