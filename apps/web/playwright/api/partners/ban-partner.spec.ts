import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { randomName, randomPartnerEmail } from "../../utils";
import { test, type ApiClient } from "../fixtures";

test.describe.configure({
  mode: "parallel",
});

async function createPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<EnrolledPartnerProps>("/api/partners", {
    name: randomName(),
    email: randomPartnerEmail(),
    ...overrides,
  });
}

async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await prisma.link.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.programEnrollment.deleteMany({
    where: {
      partnerId,
    },
  });

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron.
  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}

async function expectPartnerBanned(
  api: ApiClient,
  partnerId: string,
  reason: string,
) {
  const { status, data } = await api.get<EnrolledPartnerProps>(
    `/api/partners/${partnerId}`,
  );

  expect(status).toEqual(200);
  expect(data).toMatchObject({
    id: partnerId,
    status: "banned",
    bannedReason: reason,
    bannedAt: expect.any(String),
  });
}

test("POST /partners/ban – by partnerId", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/partners/ban",
      {
        partnerId,
        reason: "fraud",
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId });

    await expectPartnerBanned(api, partnerId, "fraud");
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners/ban – by tenantId", async ({ api, program }) => {
  let partnerId: string | undefined;
  const tenantId = nanoid();

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      tenantId,
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);
    expect(created.tenantId).toBe(tenantId);

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/partners/ban",
      {
        tenantId,
        reason: "fraud",
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId });

    await expectPartnerBanned(api, partnerId, "fraud");
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners/ban – already banned", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const { data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;

    const { status } = await api.post("/api/partners/ban", {
      partnerId,
      reason: "fraud",
    });
    expect(status).toEqual(200);

    expect(
      await api.post("/api/partners/ban", {
        partnerId,
        reason: "spam",
      }),
    ).toEqual({
      status: 400,
      data: {
        error: {
          code: "bad_request",
          message: "This partner is already banned from your program.",
          doc_url: "https://dub.co/docs/api-reference/errors#bad-request",
        },
      },
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /partners/ban – partner not found", async ({ api, program }) => {
  const partnerId = `pn_${nanoid()}`;

  expect(
    await api.post("/api/partners/ban", {
      partnerId,
      reason: "fraud",
    }),
  ).toEqual({
    status: 404,
    data: {
      error: {
        code: "not_found",
        message: `Partner ${partnerId} is not enrolled in program ${program.id}.`,
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    },
  });
});

test("POST /partners/ban – tenantId not found", async ({ api }) => {
  const tenantId = nanoid();

  expect(
    await api.post("/api/partners/ban", {
      tenantId,
      reason: "fraud",
    }),
  ).toEqual({
    status: 404,
    data: {
      error: {
        code: "not_found",
        message: `Partner with tenantId ${tenantId} not found in program.`,
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    },
  });
});

const invalidReasonError = {
  status: 422,
  data: {
    error: {
      code: "unprocessable_entity",
      message:
        'invalid_value: reason: Invalid option: expected one of "tos_violation"|"inappropriate_content"|"fake_traffic"|"fraud"|"spam"|"brand_abuse"',
      doc_url: "https://dub.co/docs/api-reference/errors#unprocessable-entity",
    },
  },
};

const banErrorCases = [
  {
    name: "POST /partners/ban – missing partnerId and tenantId",
    body: { reason: "fraud" },
    expected: {
      status: 400,
      data: {
        error: {
          code: "bad_request",
          message: "Either `partnerId` or `tenantId` must be provided.",
          doc_url: "https://dub.co/docs/api-reference/errors#bad-request",
        },
      },
    },
  },
  {
    name: "POST /partners/ban – missing reason",
    body: { partnerId: "pn_test" },
    expected: invalidReasonError,
  },
  {
    name: "POST /partners/ban – invalid reason",
    body: { partnerId: "pn_test", reason: "not_a_reason" },
    expected: invalidReasonError,
  },
];

for (const { name, body, expected } of banErrorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/partners/ban", body)).toEqual(expected);
  });
}
