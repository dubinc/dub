import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import type { PartnerTagProps } from "@/lib/types";
import { listPartnerTagsResponseSchema } from "@/lib/zod/schemas/partner-tags";
import { nanoid } from "@dub/utils";
import { expect, type APIRequest } from "@playwright/test";
import * as z from "zod/v4";
import { apiError, randomName } from "../../utils";
import {
  test as base,
  createBearerApiClient,
  type ApiClient,
} from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type PartnerTagList = z.infer<typeof listPartnerTagsResponseSchema>;

async function withScopedApi(
  {
    playwright,
    workspaceId,
    scopes,
    baseURL,
  }: {
    playwright: { request: APIRequest };
    workspaceId: string;
    scopes: string;
    baseURL?: string;
  },
  run: (api: ApiClient) => Promise<void>,
) {
  const token = `dub_pw_${nanoid(24)}`;
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: TEST_WORKSPACE.user.email },
    select: { id: true },
  });

  const restrictedToken = await prisma.restrictedToken.create({
    data: {
      name: "Playwright partner tags",
      hashedKey: await hashToken(token),
      partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
      userId: user.id,
      projectId: workspaceId,
      scopes,
    },
  });

  const { api, dispose } = await createBearerApiClient({
    playwright,
    token,
    baseURL,
  });

  try {
    await run(api);
  } finally {
    await dispose();
    await prisma.restrictedToken.delete({
      where: { id: restrictedToken.id },
    });
  }
}

const test = base.extend<{}, { partnerTagsApi: ApiClient }>({
  partnerTagsApi: [
    async ({ playwright, workspace }, use, workerInfo) => {
      await withScopedApi(
        {
          playwright,
          workspaceId: workspace.id,
          scopes: "partnerTags.write",
          baseURL: workerInfo.project.use.baseURL,
        },
        (api) => use(api),
      );
    },
    { scope: "worker" },
  ],
});

async function createPartnerTag(api: ApiClient, name = randomName("ptag")) {
  return api.post<PartnerTagProps>("/api/partner-tags", { name });
}

async function deletePartnerTag(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/partner-tags/${id}`);
}

function forbidden(
  workspaceId: string,
  permission: "partnerTags.read" | "partnerTags.write",
) {
  return apiError({
    code: "forbidden",
    message: `The provided key does not have the required permissions for this endpoint on the workspace '${workspaceId}'. Having the '${permission}' permission would allow this request to continue.`,
  });
}

test("partner tag routes reject a token without partnerTags scopes", async ({
  playwright,
  workspace,
}, testInfo) => {
  const readError = forbidden(workspace.id, "partnerTags.read");
  const writeError = forbidden(workspace.id, "partnerTags.write");

  await withScopedApi(
    {
      playwright,
      workspaceId: workspace.id,
      scopes: "apis.all",
      baseURL: testInfo.project.use.baseURL,
    },
    async (api) => {
      expect(await api.get("/api/partner-tags")).toEqual(readError);
      expect(
        await api.post("/api/partner-tags", { name: randomName("ptag") }),
      ).toEqual(writeError);
      expect(
        await api.patch("/api/partner-tags/ptag_missing", {
          name: randomName("ptag"),
        }),
      ).toEqual(writeError);
      expect(await api.delete("/api/partner-tags/ptag_missing")).toEqual(
        writeError,
      );
    },
  );
});

test("POST /partner-tags", async ({ partnerTagsApi }) => {
  let id: string | undefined;
  const name = randomName("ptag");

  try {
    const { status, data } = await partnerTagsApi.post<PartnerTagProps>(
      "/api/partner-tags",
      { name },
    );
    id = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      id: expect.stringMatching(/^ptag_/),
      name,
    });
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

test("POST /partner-tags – name at max length", async ({ partnerTagsApi }) => {
  let id: string | undefined;
  const name = randomName("ptag").padEnd(100, "x");

  try {
    const { status, data } = await createPartnerTag(partnerTagsApi, name);
    id = data.id;

    expect(status).toEqual(201);
    expect(data.name).toBe(name);
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

const errorCases = [
  {
    name: "POST /partner-tags – missing name",
    body: {},
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "invalid_type: name: Invalid input: expected string, received undefined",
    }),
  },
  {
    name: "POST /partner-tags – empty name",
    body: { name: "" },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "too_small: name: Too small: expected string to have >=1 characters",
    }),
  },
  {
    name: "POST /partner-tags – name too long",
    body: { name: "a".repeat(101) },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "too_big: name: Too big: expected string to have <=100 characters",
    }),
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ partnerTagsApi }) => {
    expect(await partnerTagsApi.post("/api/partner-tags", body)).toEqual(
      expected,
    );
  });
}

test("POST /partner-tags – duplicate name", async ({ partnerTagsApi }) => {
  let id: string | undefined;
  const name = randomName("ptag");

  try {
    const { data } = await createPartnerTag(partnerTagsApi, name);
    id = data.id;

    expect(await partnerTagsApi.post("/api/partner-tags", { name })).toEqual(
      apiError({
        code: "conflict",
        message: "A partner tag with that name already exists.",
      }),
    );
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

test("GET /partner-tags", async ({ partnerTagsApi }) => {
  let id: string | undefined;
  const name = randomName("ptag");

  try {
    const { data: created } = await createPartnerTag(partnerTagsApi, name);
    id = created.id;

    const { status, data } = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({ search: name })}`,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      hasMore: false,
      nextCursor: null,
      data: [{ id, name }],
    });
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

test("GET /partner-tags – pagination", async ({ partnerTagsApi }) => {
  const prefix = randomName("ptag");
  let olderId: string | undefined;
  let newerId: string | undefined;

  try {
    const older = await createPartnerTag(partnerTagsApi, `${prefix}-older`);
    olderId = older.data.id;
    const newer = await createPartnerTag(partnerTagsApi, `${prefix}-newer`);
    newerId = newer.data.id;

    await prisma.partnerTag.update({
      where: { id: olderId },
      data: { createdAt: new Date("2020-01-01T00:00:00.000Z") },
    });
    await prisma.partnerTag.update({
      where: { id: newerId },
      data: { createdAt: new Date("2020-01-02T00:00:00.000Z") },
    });

    const olderTag = { id: olderId, name: `${prefix}-older` };
    const newerTag = { id: newerId, name: `${prefix}-newer` };

    const { status, data: listed } = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({
        ids: `${olderId},${newerId}`,
      })}`,
    );

    expect(status).toEqual(200);
    expect(listed).toStrictEqual({
      hasMore: false,
      nextCursor: null,
      data: [newerTag, olderTag],
    });

    const page = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({
        search: prefix,
        pageSize: "1",
        sortOrder: "desc",
      })}`,
    );

    expect(page.status).toEqual(200);
    expect(page.data).toStrictEqual({
      hasMore: true,
      nextCursor: newerId,
      data: [newerTag],
    });

    const next = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({
        search: prefix,
        pageSize: "1",
        sortOrder: "desc",
        startingAfter: newerId,
      })}`,
    );

    expect(next.status).toEqual(200);
    expect(next.data).toStrictEqual({
      hasMore: false,
      nextCursor: null,
      data: [olderTag],
    });

    const asc = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({
        search: prefix,
        sortOrder: "asc",
      })}`,
    );

    expect(asc.status).toEqual(200);
    expect(asc.data.data).toStrictEqual([olderTag, newerTag]);
  } finally {
    await deletePartnerTag(partnerTagsApi, olderId);
    await deletePartnerTag(partnerTagsApi, newerId);
  }
});

test("GET /partner-tags – both cursors", async ({ partnerTagsApi }) => {
  expect(
    await partnerTagsApi.get(
      `/api/partner-tags?${new URLSearchParams({
        startingAfter: "ptag_invalid",
        endingBefore: "ptag_invalid",
      })}`,
    ),
  ).toEqual(
    apiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both startingAfter and endingBefore at the same time.",
    }),
  );
});

test("GET /partner-tags – invalid cursor", async ({ partnerTagsApi }) => {
  const invalidCursor = apiError({
    code: "unprocessable_entity",
    message: "Invalid cursor: the provided ID does not exist.",
  });

  expect(
    await partnerTagsApi.get(
      "/api/partner-tags?startingAfter=ptag_invalidcursor",
    ),
  ).toEqual(invalidCursor);
});

test("GET /partner-tags – cursor for a deleted tag", async ({
  partnerTagsApi,
}) => {
  let id: string | undefined;

  try {
    const { data } = await createPartnerTag(partnerTagsApi);
    id = data.id;
    await deletePartnerTag(partnerTagsApi, id);

    expect(
      await partnerTagsApi.get(`/api/partner-tags?startingAfter=${id}`),
    ).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: "Invalid cursor: the provided ID does not exist.",
      }),
    );
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

test("GET /partner-tags – page size too big", async ({ partnerTagsApi }) => {
  expect(await partnerTagsApi.get("/api/partner-tags?pageSize=101")).toEqual(
    apiError({
      code: "unprocessable_entity",
      message: "too_big: pageSize: Max page size is 100.",
    }),
  );
});

test("PATCH /partner-tags/{partnerTagId}", async ({ partnerTagsApi }) => {
  let id: string | undefined;
  const name = randomName("ptag");
  const renamed = `${name}-renamed`;

  try {
    const { data: created } = await createPartnerTag(partnerTagsApi, name);
    id = created.id;

    const { status, data } = await partnerTagsApi.patch<PartnerTagProps>(
      `/api/partner-tags/${id}`,
      { name: renamed },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ id, name: renamed });

    const { data: listed } = await partnerTagsApi.get<PartnerTagList>(
      `/api/partner-tags?${new URLSearchParams({ search: renamed })}`,
    );

    expect(listed.data).toStrictEqual([{ id, name: renamed }]);
  } finally {
    await deletePartnerTag(partnerTagsApi, id);
  }
});

test("PATCH /partner-tags/{partnerTagId} – duplicate name", async ({
  partnerTagsApi,
}) => {
  let firstId: string | undefined;
  let secondId: string | undefined;
  const firstName = randomName("ptag");
  const secondName = randomName("ptag");

  try {
    const first = await createPartnerTag(partnerTagsApi, firstName);
    firstId = first.data.id;
    const second = await createPartnerTag(partnerTagsApi, secondName);
    secondId = second.data.id;

    expect(
      await partnerTagsApi.patch(`/api/partner-tags/${secondId}`, {
        name: firstName,
      }),
    ).toEqual(
      apiError({
        code: "conflict",
        message: "A partner tag with that name already exists.",
      }),
    );
  } finally {
    await deletePartnerTag(partnerTagsApi, firstId);
    await deletePartnerTag(partnerTagsApi, secondId);
  }
});

test("PATCH /partner-tags/{partnerTagId} – not found", async ({
  partnerTagsApi,
}) => {
  expect(
    await partnerTagsApi.patch("/api/partner-tags/ptag_missing", {
      name: randomName("ptag"),
    }),
  ).toEqual(
    apiError({
      code: "not_found",
      message: "Partner tag not found.",
    }),
  );
});

test("DELETE /partner-tags/{partnerTagId}", async ({ partnerTagsApi }) => {
  const name = randomName("ptag");
  const { data: created } = await createPartnerTag(partnerTagsApi, name);

  const { status, data } = await partnerTagsApi.delete<{ id: string }>(
    `/api/partner-tags/${created.id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({ id: created.id });

  const { data: listed } = await partnerTagsApi.get<PartnerTagList>(
    `/api/partner-tags?${new URLSearchParams({ search: name })}`,
  );

  expect(listed).toStrictEqual({
    hasMore: false,
    nextCursor: null,
    data: [],
  });

  let reusedId: string | undefined;

  try {
    const reused = await createPartnerTag(partnerTagsApi, name);
    reusedId = reused.data.id;

    expect(reused.status).toEqual(201);
    expect(reused.data.name).toBe(name);
  } finally {
    await deletePartnerTag(partnerTagsApi, reusedId);
  }
});

test("DELETE /partner-tags/{partnerTagId} – not found", async ({
  partnerTagsApi,
}) => {
  expect(await partnerTagsApi.delete("/api/partner-tags/ptag_missing")).toEqual(
    apiError({
      code: "not_found",
      message: "Partner tag not found.",
    }),
  );
});
