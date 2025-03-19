import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import z from "@/lib/zod";
import { Link } from "@dub/prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK, E2E_TAG, E2E_TAG_2 } from "../utils/resource";
import { LinkSchema, expectedLink } from "../utils/schema";

const { domain } = E2E_LINK;

const setupBulkTest = async (ctx: any) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);
  return { h, http, user, workspaceId, projectId };
};

interface VerifyBulkLinksParams {
  links: Link[];
  bulkLinks: Array<{
    url: string;
    domain: string;
    tagIds?: string[];
    tagNames?: string[];
  }>;
  context: {
    user: { id: string };
    projectId: string;
    workspaceId: string;
  };
  expectedTags?: { id: string; name: string; color: string }[];
}

const verifyBulkLinks = ({
  links,
  bulkLinks,
  context: { user, projectId, workspaceId },
  expectedTags,
}: VerifyBulkLinksParams) => {
  const firstLink = links.find((l) => l.url === bulkLinks[0].url);
  const secondLink = links.find((l) => l.url === bulkLinks[1].url);

  expect(links).toHaveLength(2);
  expect(firstLink).toStrictEqual({
    ...expectedLink,
    url: bulkLinks[0].url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${firstLink?.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink?.key}?qr=1`,
    ...(expectedTags ? { tags: expectedTags, tagId: expectedTags[0].id } : {}),
  });
  expect(secondLink).toStrictEqual({
    ...expectedLink,
    url: bulkLinks[1].url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${secondLink?.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${secondLink?.key}?qr=1`,
    ...(expectedTags ? { tags: expectedTags, tagId: expectedTags[0].id } : {}),
  });
  expect(z.array(LinkSchema.strict()).parse(links)).toBeTruthy();
};

test("POST /links/bulk", async (ctx) => {
  const testContext = await setupBulkTest(ctx);
  const { h } = testContext;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
  }));

  const { status, data: links } = await testContext.http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  onTestFinished(async () => {
    await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
  });

  expect(status).toEqual(200);
  verifyBulkLinks({ links, bulkLinks, context: testContext });
});

test("POST /links/bulk with tag ID", async (ctx) => {
  const testContext = await setupBulkTest(ctx);
  const { h } = testContext;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
    tagIds: [E2E_TAG.id],
  }));

  const { status, data: links } = await testContext.http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  onTestFinished(async () => {
    await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
  });

  expect(status).toEqual(200);
  verifyBulkLinks({
    links,
    bulkLinks,
    context: testContext,
    expectedTags: [E2E_TAG],
  });
});

test("POST /links/bulk with tag name", async (ctx) => {
  const testContext = await setupBulkTest(ctx);
  const { h } = testContext;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
    tagNames: [E2E_TAG.name],
  }));

  const { status, data: links } = await testContext.http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  onTestFinished(async () => {
    await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
  });

  expect(status).toEqual(200);
  verifyBulkLinks({
    links,
    bulkLinks,
    context: testContext,
    expectedTags: [E2E_TAG],
  });
});

test("POST /links/bulk with multiple tags (by ID)", async (ctx) => {
  const testContext = await setupBulkTest(ctx);
  const { h } = testContext;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
    tagIds: [E2E_TAG_2.id, E2E_TAG.id],
  }));

  const { status, data: links } = await testContext.http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  onTestFinished(async () => {
    await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
  });

  expect(status).toEqual(200);
  verifyBulkLinks({
    links,
    bulkLinks,
    context: testContext,
    expectedTags: [E2E_TAG_2, E2E_TAG],
  });
});

test("POST /links/bulk with multiple tags (by name)", async (ctx) => {
  const testContext = await setupBulkTest(ctx);
  const { h } = testContext;

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
    tagNames: [E2E_TAG_2.name, E2E_TAG.name],
  }));

  const { status, data: links } = await testContext.http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  onTestFinished(async () => {
    await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
  });

  expect(status).toEqual(200);
  verifyBulkLinks({
    links,
    bulkLinks,
    context: testContext,
    expectedTags: [E2E_TAG_2, E2E_TAG],
  });
});
