import { Domain, Link } from "@prisma/client";
import { expect, onTestFinished, test } from "vitest";
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

test("DELETE /links/bulk - skips root links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const slug = `${randomId()}.dub-internal-test.com`;

  await http.post<Domain>({
    path: "/domains",
    query: { workspaceId: workspace.id },
    body: { slug },
  });

  onTestFinished(async () => {
    await h.deleteDomain(slug);
  });

  const { data: rootLink } = await http.get<Link>({
    path: "/links/info",
    query: { workspaceId: workspace.id, domain: slug },
  });

  const { data: normalLink } = await http.post<Link>({
    path: "/links",
    body: {
      url: `https://example.com/${randomId()}`,
      domain: slug,
    },
  });

  const { status, data } = await http.delete<{
    deletedCount: number;
  }>({
    path: "/links/bulk",
    query: {
      linkIds: [rootLink.id, normalLink.id].join(","),
    },
  });

  expect(status).toEqual(200);
  expect(data.deletedCount).toEqual(1);

  const { status: rootStatus } = await http.get({
    path: `/links/${rootLink.id}`,
  });
  const { status: normalStatus } = await http.get({
    path: `/links/${normalLink.id}`,
  });

  expect(rootStatus).toBe(200);
  expect(normalStatus).toBe(404);
});
