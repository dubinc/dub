import { createId } from "@/lib/api/create-id";
import { constructDiscountCode } from "@/lib/discounts/construct-discount-code";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { DiscountCodeSchema } from "@/lib/zod/schemas/discount";
import { DEFAULT_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { DiscountProvider, RewardStructure } from "@prisma/client";
import * as z from "zod/v4";
import { randomName, randomPartnerEmail } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type DiscountCode = z.infer<typeof DiscountCodeSchema>;

test.describe.configure({
  mode: "parallel",
});

const customDiscount = {
  amount: 10,
  type: RewardStructure.percentage,
  maxDuration: 6,
  provider: DiscountProvider.custom,
};

let customDiscountId: string | undefined;
let partnerGroupId: string | undefined;

test.beforeAll(async ({ program }) => {
  const discount = await prisma.discount.create({
    data: {
      id: createId({ prefix: "disc_" }),
      programId: program.id,
      ...customDiscount,
    },
  });

  const group = await prisma.partnerGroup.create({
    data: {
      id: createId({ prefix: "grp_" }),
      programId: program.id,
      slug: `pw-dcode-${nanoid(8).toLowerCase()}`,
      name: "Playwright Discount Codes",
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
      discountId: discount.id,
    },
  });

  await prisma.partnerGroupDefaultLink.create({
    data: {
      id: createId({ prefix: "pgdl_" }),
      programId: program.id,
      groupId: group.id,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
    },
  });

  partnerGroupId = group.id;
  customDiscountId = discount.id;
});

test.afterAll(async () => {
  if (partnerGroupId) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: partnerGroupId,
      },
      select: {
        partnerId: true,
      },
    });

    for (const enrollment of programEnrollments) {
      await deletePartner(enrollment.partnerId);
    }

    await prisma.partnerGroupDefaultLink.deleteMany({
      where: {
        groupId: partnerGroupId,
      },
    });

    await prisma.partnerGroup.delete({
      where: {
        id: partnerGroupId,
      },
    });
  }

  if (customDiscountId) {
    await prisma.discountCode.deleteMany({
      where: {
        discountId: customDiscountId,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        discountId: customDiscountId,
      },
      data: {
        discountId: null,
      },
    });

    await prisma.discount.delete({
      where: {
        id: customDiscountId,
      },
    });
  }
});

async function createPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  if (!partnerGroupId) {
    throw new Error("Custom discount group was not seeded.");
  }

  return api.post<EnrolledPartnerProps>("/api/partners", {
    name: randomName(),
    email: randomPartnerEmail(),
    groupId: partnerGroupId,
    ...overrides,
  });
}

async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await prisma.discountCode.deleteMany({
    where: {
      partnerId,
    },
  });

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

  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}

async function createDiscountCode(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  const { data: partner } = await createPartner(api);
  const linkId = partner.links?.[0]?.id;

  if (!linkId) {
    throw new Error("Partner was created without a default link.");
  }

  const body = {
    partnerId: partner.id,
    linkId,
    code: `PW${nanoid(8)}`,
    ...overrides,
  };

  const response = await api.post<DiscountCode>("/api/discount-codes", body);

  return { partner, linkId, body, ...response };
}

test("POST /discount-codes", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const { status, data, partner, body } = await createDiscountCode(api);
    partnerId = partner.id;

    expect(status).toEqual(200);
    expect(data).toEqual({
      id: expect.any(String),
      code: body.code,
      discountId: customDiscountId,
      partnerId: partner.id,
      linkId: body.linkId,
      disabledAt: null,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /discount-codes – omits code and auto-generates", async ({
  api,
}) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;
    const linkId = partner.links?.[0]?.id;

    const { status, data } = await api.post<DiscountCode>(
      "/api/discount-codes",
      {
        partnerId: partner.id,
        linkId,
      },
    );

    expect(status).toEqual(200);
    expect(data.code).toEqual(expect.any(String));
    expect(data.code.length).toBeGreaterThan(0);
    expect(data.partnerId).toEqual(partner.id);
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /discount-codes – auto-generated first-name collision retries", async ({
  api,
}) => {
  let partnerIdA: string | undefined;
  let partnerIdB: string | undefined;

  try {
    const firstName = `Sarah${nanoid(6)}`;
    const { data: partnerA } = await createPartner(api, {
      name: `${firstName} One`,
    });
    const { data: partnerB } = await createPartner(api, {
      name: `${firstName} Two`,
    });
    partnerIdA = partnerA.id;
    partnerIdB = partnerB.id;

    const expectedBase = constructDiscountCode({
      partner: partnerA,
      discount: customDiscount,
    });

    const first = await api.post<DiscountCode>("/api/discount-codes", {
      partnerId: partnerA.id,
      linkId: partnerA.links?.[0]?.id,
    });
    const second = await api.post<DiscountCode>("/api/discount-codes", {
      partnerId: partnerB.id,
      linkId: partnerB.links?.[0]?.id,
    });

    expect(first.status).toEqual(200);
    expect(second.status).toEqual(200);
    expect(first.data.code).toEqual(expectedBase);
    expect(second.data.code).not.toEqual(first.data.code);
    expect(second.data.code.startsWith(expectedBase)).toBe(true);
    expect(second.data.code.length).toEqual(expectedBase.length + 2);
  } finally {
    await deletePartner(partnerIdA);
    await deletePartner(partnerIdB);
  }
});

test("POST /discount-codes – same link", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const created = await createDiscountCode(api);
    partnerId = created.partner.id;

    const { status, data } = await api.post("/api/discount-codes", {
      partnerId: created.partner.id,
      linkId: created.linkId,
      code: `PW${nanoid(8)}`,
    });

    expect(status).toEqual(400);
    expect(data).toEqual({
      error: {
        code: "bad_request",
        message: `This link already has a discount code (${created.data.code}) assigned.`,
        doc_url: "https://dub.co/docs/api-reference/errors#bad-request",
      },
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /discount-codes – duplicate code", async ({ api }) => {
  let partnerIdA: string | undefined;
  let partnerIdB: string | undefined;

  try {
    const first = await createDiscountCode(api);
    partnerIdA = first.partner.id;

    const { data: partnerB } = await createPartner(api);
    partnerIdB = partnerB.id;

    const { status, data } = await api.post("/api/discount-codes", {
      partnerId: partnerB.id,
      linkId: partnerB.links?.[0]?.id,
      code: first.body.code,
    });

    expect(status).toEqual(409);
    expect(data).toMatchObject({
      error: {
        code: "conflict",
        message: expect.stringContaining(
          `This discount code "${first.body.code}" is already in use`,
        ),
        doc_url: "https://dub.co/docs/api-reference/errors#conflict",
      },
    });
  } finally {
    await deletePartner(partnerIdA);
    await deletePartner(partnerIdB);
  }
});

const invalidCodeCases = [
  {
    name: "POST /discount-codes – invalid characters",
    code: "NOT VALID!",
    message:
      "invalid_format: code: Code can only contain letters, numbers, dashes, and underscores.",
  },
  {
    name: "POST /discount-codes – too long",
    code: "A".repeat(101),
    message: "too_big: code: Code must be 100 characters or fewer.",
  },
];

for (const { name, code, message } of invalidCodeCases) {
  test(name, async ({ api }) => {
    expect(
      await api.post("/api/discount-codes", {
        partnerId: "pn_x",
        linkId: "link_x",
        code,
      }),
    ).toEqual({
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message,
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    });
  });
}

test("POST /discount-codes – missing partnerId", async ({ api }) => {
  expect(
    await api.post("/api/discount-codes", {
      linkId: "link_missing",
      code: `PW${nanoid(8)}`,
    }),
  ).toEqual({
    status: 422,
    data: {
      error: {
        code: "unprocessable_entity",
        message:
          "invalid_type: partnerId: Invalid input: expected string, received undefined",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    },
  });
});

test("GET /discount-codes – by partnerId", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const created = await createDiscountCode(api);
    partnerId = created.partner.id;

    const { status, data } = await api.get<DiscountCode[]>(
      `/api/discount-codes?partnerId=${partnerId}`,
    );

    expect(status).toEqual(200);
    expect(data).toEqual([created.data]);
  } finally {
    await deletePartner(partnerId);
  }
});

test("GET /discount-codes – by discountId", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const created = await createDiscountCode(api);
    partnerId = created.partner.id;

    const { status, data } = await api.get<DiscountCode[]>(
      `/api/discount-codes?discountId=${created.data.discountId}&partnerId=${partnerId}`,
    );

    expect(status).toEqual(200);
    expect(data.map((code) => code.id)).toContain(created.data.id);
  } finally {
    await deletePartner(partnerId);
  }
});

test("GET /discount-codes – pagination", async ({ api }) => {
  let partnerIdA: string | undefined;
  let partnerIdB: string | undefined;

  try {
    const first = await createDiscountCode(api);
    const second = await createDiscountCode(api);
    partnerIdA = first.partner.id;
    partnerIdB = second.partner.id;

    const { status, data } = await api.get<DiscountCode[]>(
      "/api/discount-codes?pageSize=1&page=1",
    );

    expect(status).toEqual(200);
    expect(data).toHaveLength(1);
  } finally {
    await deletePartner(partnerIdA);
    await deletePartner(partnerIdB);
  }
});

test("GET /discount-codes – unknown partner", async ({ api, program }) => {
  expect(
    await api.get("/api/discount-codes?partnerId=pn_does_not_exist"),
  ).toEqual({
    status: 404,
    data: {
      error: {
        code: "not_found",
        message: `Partner pn_does_not_exist is not enrolled in program ${program.id}.`,
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    },
  });
});

test("DELETE /discount-codes/{id}", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const created = await createDiscountCode(api);
    partnerId = created.partner.id;

    const { status, data } = await api.delete<{ id: string }>(
      `/api/discount-codes/${created.data.id}`,
    );

    expect(status).toEqual(200);
    expect(data).toEqual({ id: created.data.id });
  } finally {
    await deletePartner(partnerId);
  }
});

test("DELETE /discount-codes/{id} – not found", async ({ api }) => {
  const { status, data } = await api.delete(
    "/api/discount-codes/dcode_does_not_exist",
  );

  expect(status).toEqual(404);
  expect(data).toEqual({
    error: {
      code: "not_found",
      message: "Discount code (dcode_does_not_exist) not found.",
      doc_url: "https://dub.co/docs/api-reference/errors#not-found",
    },
  });
});
