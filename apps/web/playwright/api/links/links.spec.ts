import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { test, type ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type Link = {
  id: string;
  url: string;
  domain: string;
  externalId: string | null;
};

const domain = TEST_WORKSPACE.program.domain;

async function createLink(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<Link>("/api/links", {
    url: `https://example.com/${nanoid()}`,
    domain,
    key: nanoid(12),
    ...overrides,
  });
}

async function deleteLink(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/links/${id}`);
}

test("PATCH /links/:id – clear externalId with empty string", async ({
  api,
}) => {
  let linkId: string | undefined;
  const externalId = nanoid(12);

  try {
    const { status: createStatus, data: created } = await createLink(api, {
      externalId,
    });
    linkId = created.id;

    expect(createStatus).toEqual(200);
    expect(created.externalId).toEqual(externalId);

    const { status, data: updated } = await api.patch<Link>(
      `/api/links/${created.id}`,
      { externalId: "" },
    );

    expect(status).toEqual(200);
    expect(updated.externalId).toBeNull();

    const { status: getStatus, data: fetched } = await api.get<Link>(
      `/api/links/${created.id}`,
    );

    expect(getStatus).toEqual(200);
    expect(fetched.externalId).toBeNull();
  } finally {
    await deleteLink(api, linkId);
  }
});

test("PATCH /links/:id – clear externalId with null", async ({ api }) => {
  let linkId: string | undefined;
  const externalId = nanoid(12);

  try {
    const { data: created } = await createLink(api, { externalId });
    linkId = created.id;

    expect(created.externalId).toEqual(externalId);

    const { status, data: updated } = await api.patch<Link>(
      `/api/links/${created.id}`,
      { externalId: null },
    );

    expect(status).toEqual(200);
    expect(updated.externalId).toBeNull();
  } finally {
    await deleteLink(api, linkId);
  }
});
