import { nanoid, sleep } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type BulkLink = {
  id: string;
  url: string;
  domain: string;
  programId: string | null;
  partnerId: string | null;
};

type BulkLinkError = {
  error: string;
  code: string;
  link: Record<string, unknown>;
};

const domain = TEST_WORKSPACE.program.domain;

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

test("POST /links/bulk – with valid programId and partnerId", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  const createdIds: string[] = [];

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const body = bulkLinkBody({
      programId: program.id,
      partnerId,
    });

    const { status, data } = await createBulkLinks(api, [body]);
    const created = data.filter(isBulkLink);
    createdIds.push(...created.map((link) => link.id));

    expect(status).toEqual(200);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      url: body.url,
      domain,
      programId: program.id,
      partnerId,
    });
  } finally {
    await deleteLinks(api, createdIds);
    await deletePartner(partnerId);
  }
});

test("POST /links/bulk – rejects invalid programId", async ({ api }) => {
  const invalidProgramId = `prog_${nanoid()}`;
  const validBody = bulkLinkBody();
  const invalidBody = bulkLinkBody({
    programId: invalidProgramId,
    partnerId: `pn_${nanoid()}`,
  });

  const createdIds: string[] = [];

  try {
    const { status, data } = await createBulkLinks(api, [
      invalidBody,
      validBody,
    ]);
    const created = data.filter(isBulkLink);
    const errors = data.filter(isBulkError);
    createdIds.push(...created.map((link) => link.id));

    expect(status).toEqual(200);
    expect(created).toHaveLength(1);
    expect(created[0].url).toEqual(validBody.url);
    expect(errors).toEqual([
      {
        error: `Invalid programId detected: ${invalidProgramId}`,
        code: "unprocessable_entity",
        link: expect.any(Object),
      },
    ]);
  } finally {
    await deleteLinks(api, createdIds);
  }
});

test("POST /links/bulk – rejects invalid partnerId", async ({
  api,
  program,
}) => {
  const invalidPartnerId = `pn_${nanoid()}`;
  const invalidBody = bulkLinkBody({
    programId: program.id,
    partnerId: invalidPartnerId,
  });

  const { status, data } = await createBulkLinks(api, [invalidBody]);

  expect(status).toEqual(200);
  expect(data.filter(isBulkLink)).toHaveLength(0);
  expect(data.filter(isBulkError)).toEqual([
    {
      error: `Invalid partnerId detected: ${invalidPartnerId}`,
      code: "unprocessable_entity",
      link: expect.any(Object),
    },
  ]);
});

test("PATCH /links/bulk – with valid programId and partnerId", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  const createdIds: string[] = [];

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const { data: created } = await createBulkLinks(api, [
      bulkLinkBody(),
      bulkLinkBody(),
    ]);
    const links = created.filter(isBulkLink);
    createdIds.push(...links.map((link) => link.id));

    expect(links).toHaveLength(2);

    const { status, data } = await api.patch<BulkLink[]>("/api/links/bulk", {
      linkIds: links.map((link) => link.id),
      data: {
        programId: program.id,
        partnerId,
      },
    });

    expect(status).toEqual(200);
    expect(data).toHaveLength(2);
    expect(data).toEqual(
      expect.arrayContaining(
        links.map((link) =>
          expect.objectContaining({
            id: link.id,
            programId: program.id,
            partnerId,
          }),
        ),
      ),
    );
  } finally {
    await deleteLinks(api, createdIds);
    await deletePartner(partnerId);
  }
});

test("PATCH /links/bulk – rejects invalid programId", async ({ api }) => {
  const createdIds: string[] = [];
  const invalidProgramId = `prog_${nanoid()}`;

  try {
    const { data: created } = await createBulkLinks(api, [bulkLinkBody()]);
    const links = created.filter(isBulkLink);
    createdIds.push(...links.map((link) => link.id));

    expect(
      await api.patch("/api/links/bulk", {
        linkIds: links.map((link) => link.id),
        data: {
          programId: invalidProgramId,
        },
      }),
    ).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: `Invalid programId detected: ${invalidProgramId}`,
      }),
    );

    const { data: unchanged } = await api.get<BulkLink>(
      `/api/links/${links[0].id}`,
    );
    expect(unchanged.programId).toBeNull();
  } finally {
    await deleteLinks(api, createdIds);
  }
});

test("PATCH /links/bulk – rejects invalid partnerId", async ({
  api,
  program,
}) => {
  const createdIds: string[] = [];
  const invalidPartnerId = `pn_${nanoid()}`;

  try {
    const { data: created } = await createBulkLinks(api, [bulkLinkBody()]);
    const links = created.filter(isBulkLink);
    createdIds.push(...links.map((link) => link.id));

    expect(
      await api.patch("/api/links/bulk", {
        linkIds: links.map((link) => link.id),
        data: {
          programId: program.id,
          partnerId: invalidPartnerId,
        },
      }),
    ).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: `Invalid partnerId detected: ${invalidPartnerId}`,
      }),
    );

    const { data: unchanged } = await api.get<BulkLink>(
      `/api/links/${links[0].id}`,
    );
    expect(unchanged.partnerId).toBeNull();
    expect(unchanged.programId).toBeNull();
  } finally {
    await deleteLinks(api, createdIds);
  }
});
