import { nanoid, sleep } from "@dub/utils";
import { expect } from "@playwright/test";
import { test, type ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type BulkLink = {
  id: string;
  url: string;
  domain: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

type BulkLinkError = {
  error: string;
  code: string;
  link: Record<string, unknown>;
};

const domain = TEST_WORKSPACE.domain;

function bulkLinkBody(overrides: Record<string, unknown> = {}) {
  return {
    url: `https://example.com/${nanoid()}`,
    domain,
    key: nanoid(12),
    ...overrides,
  };
}

async function createBulkLinks(
  api: ApiClient,
  bodies: Record<string, unknown>[],
) {
  let response: { status: number; data: unknown } | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    response = await api.post<unknown>("/api/links/bulk", bodies);

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await sleep(1000 * (attempt + 1));
  }

  expect(response?.status, JSON.stringify(response?.data)).toEqual(200);
  expect(
    Array.isArray(response?.data),
    `Expected bulk create to return an array, got: ${JSON.stringify(response?.data)}`,
  ).toBe(true);

  return response as { status: number; data: (BulkLink | BulkLinkError)[] };
}

async function deleteLinks(api: ApiClient, ids: (string | undefined)[]) {
  const linkIds = ids.filter((id): id is string => Boolean(id));
  if (linkIds.length === 0) return;
  await api.delete(`/api/links/bulk?linkIds=${linkIds.join(",")}`);
}

function isBulkError(item: BulkLink | BulkLinkError): item is BulkLinkError {
  return "error" in item;
}

function isBulkLink(item: BulkLink | BulkLinkError): item is BulkLink {
  return !isBulkError(item);
}

test("PATCH /links/bulk – ignores non-UTM URL query params", async ({
  api,
}) => {
  const createdIds: string[] = [];
  // Real-world tracking params that are not Link columns (must not be
  // spread into the Prisma update payload).
  const gclid = nanoid(16);
  const fbclid = nanoid(20);
  const mcCid = nanoid(10);
  const destinationUrl = `https://shop.example.com/products/shoes?gclid=${gclid}&fbclid=${fbclid}&mc_cid=${mcCid}&utm_source=newsletter&utm_medium=email&utm_campaign=spring`;

  try {
    const { data: created } = await createBulkLinks(api, [bulkLinkBody()]);
    const links = created.filter(isBulkLink);
    createdIds.push(...links.map((link) => link.id));

    expect(links).toHaveLength(1);

    const { status, data } = await api.patch<BulkLink[]>("/api/links/bulk", {
      linkIds: links.map((link) => link.id),
      data: {
        url: destinationUrl,
      },
    });

    expect(status).toEqual(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: links[0].id,
      url: destinationUrl,
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "spring",
      utm_term: null,
      utm_content: null,
    });
    expect(data[0]).not.toHaveProperty("gclid");
    expect(data[0]).not.toHaveProperty("fbclid");
    expect(data[0]).not.toHaveProperty("mc_cid");
  } finally {
    await deleteLinks(api, createdIds);
  }
});
