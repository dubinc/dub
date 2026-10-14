import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { Customer } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import {
  apiError,
  expectNoOverlap,
  expectSortedByCreatedAt,
  expectSortedById,
} from "../../utils";
import { test } from "../fixtures";

const PAGE_SIZE = 5;
const SEED_COUNT = 25;

test("GET /customers – rejects both startingAfter and endingBefore", async ({
  api,
}) => {
  expect(
    await api.get(
      `/api/customers?${new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        startingAfter: "id",
        endingBefore: "id",
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

test("GET /customers – rejects page > MAX_OFFSET_PAGE", async ({ api }) => {
  expect(
    await api.get(
      `/api/customers?${new URLSearchParams({
        page: "1001",
        pageSize: "10",
      })}`,
    ),
  ).toEqual(
    apiError({
      code: "unprocessable_entity",
      message:
        "Page is too big (cannot be more than 1000), recommend using cursor-based pagination instead.",
    }),
  );
});

test("GET /customers – invalid cursor ID (startingAfter / endingBefore)", async ({
  api,
}) => {
  const invalidCursorError = apiError({
    code: "unprocessable_entity",
    message: "Invalid cursor: the provided ID does not exist.",
  });

  const { status: statusAfter, data: errorAfter } = await api.get(
    `/api/customers?${new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      startingAfter: "cus_invalid_id_12345",
    })}`,
  );

  expect({ status: statusAfter, data: errorAfter }).toEqual(invalidCursorError);

  const { status: statusBefore, data: errorBefore } = await api.get(
    `/api/customers?${new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      endingBefore: "cus_invalid_id_12345",
    })}`,
  );

  expect({ status: statusBefore, data: errorBefore }).toEqual(
    invalidCursorError,
  );
});

test.describe("with seeded customers", () => {
  // Shared Prisma seed for this describe; serial so beforeAll runs once per worker group.
  test.describe.configure({ mode: "serial" });

  let seededIds: string[] = [];
  let baseline: Customer[] = [];
  let baselineIds: string[] = [];
  // Cursor pagination orders by id (see buildPaginationQuery), not createdAt.
  let idsByIdDesc: string[] = [];
  let customerIdsParam = "";

  const sortQuery = {
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  test.beforeAll(async ({ api, workspace }) => {
    const batch = nanoid(8);
    const now = Date.now();

    const rows = Array.from({ length: SEED_COUNT }, (_, i) => ({
      id: createId({ prefix: "cus_" }),
      name: `pw-page-${batch}-${i}`,
      email: `pw-page-${batch}-${i}@dub-internal-test.com`,
      externalId: `ext_pw_page_${batch}_${i}`,
      country: "US",
      projectId: workspace.id,
      createdAt: new Date(now - i * 1000),
    }));

    await prisma.customer.createMany({ data: rows });
    seededIds = rows.map((r) => r.id);
    customerIdsParam = seededIds.join(",");
    idsByIdDesc = [...seededIds].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    const { status, data } = await api.get<Customer[]>(
      `/api/customers?${new URLSearchParams({
        ...sortQuery,
        pageSize: String(SEED_COUNT),
        customerIds: customerIdsParam,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data).toHaveLength(SEED_COUNT);

    baseline = data;
    baselineIds = baseline.map((c) => c.id);
    expectSortedByCreatedAt(baseline);
  });

  test.afterAll(async () => {
    if (seededIds.length === 0) return;
    await prisma.customer.deleteMany({
      where: { id: { in: seededIds } },
    });
  });

  test("GET /customers – offset pagination", async ({ api }) => {
    const page1 = await api.get<Customer[]>(
      `/api/customers?${new URLSearchParams({
        ...sortQuery,
        page: "1",
        pageSize: String(PAGE_SIZE),
        customerIds: customerIdsParam,
      })}`,
    );
    const page2 = await api.get<Customer[]>(
      `/api/customers?${new URLSearchParams({
        ...sortQuery,
        page: "2",
        pageSize: String(PAGE_SIZE),
        customerIds: customerIdsParam,
      })}`,
    );

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);

    expect(page1.data.map((c) => c.id)).toEqual(
      baselineIds.slice(0, PAGE_SIZE),
    );
    expect(page2.data.map((c) => c.id)).toEqual(
      baselineIds.slice(PAGE_SIZE, PAGE_SIZE * 2),
    );
    expectNoOverlap(page1.data, page2.data);
  });

  test("GET /customers – cursor forward (startingAfter)", async ({ api }) => {
    const firstPageIds = idsByIdDesc.slice(0, PAGE_SIZE);
    const cursor = firstPageIds[PAGE_SIZE - 1];
    const expectedIds = idsByIdDesc.slice(PAGE_SIZE, PAGE_SIZE * 2);

    const { status, data } = await api.get<Customer[]>(
      `/api/customers?${new URLSearchParams({
        ...sortQuery,
        pageSize: String(PAGE_SIZE),
        startingAfter: cursor,
        customerIds: customerIdsParam,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data.map((c) => c.id)).toEqual(expectedIds);
    expect(data.every((c) => c.id < cursor)).toBe(true);
    expectSortedById(data, "desc");
    expectNoOverlap(
      firstPageIds.map((id) => ({ id })),
      data,
    );
  });

  test("GET /customers – cursor backward (endingBefore)", async ({ api }) => {
    const cursor = idsByIdDesc[PAGE_SIZE];
    const expectedIds = idsByIdDesc.slice(0, PAGE_SIZE);

    const { status, data } = await api.get<Customer[]>(
      `/api/customers?${new URLSearchParams({
        ...sortQuery,
        pageSize: String(PAGE_SIZE),
        endingBefore: cursor,
        customerIds: customerIdsParam,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data.map((c) => c.id)).toEqual(expectedIds);
    expect(data.every((c) => c.id > cursor)).toBe(true);
    expectSortedById(data, "desc");
  });

  test("GET /customers – rejects mixing page with startingAfter / endingBefore", async ({
    api,
  }) => {
    const mixedPaginationError = apiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both page and startingAfter/endingBefore at the same time. Please use one pagination method.",
    });

    const { status: statusAfter, data: errorAfter } = await api.get(
      `/api/customers?${new URLSearchParams({
        page: "2",
        pageSize: String(PAGE_SIZE),
        startingAfter: baseline[PAGE_SIZE - 1].id,
      })}`,
    );

    expect({ status: statusAfter, data: errorAfter }).toEqual(
      mixedPaginationError,
    );

    const { status: statusBefore, data: errorBefore } = await api.get(
      `/api/customers?${new URLSearchParams({
        page: "2",
        pageSize: String(PAGE_SIZE),
        endingBefore: baseline[PAGE_SIZE].id,
      })}`,
    );

    expect({ status: statusBefore, data: errorBefore }).toEqual(
      mixedPaginationError,
    );
  });

  test("GET /customers – rejects cursor pagination with unsupported sort field", async ({
    api,
  }) => {
    const { status, data: error } = await api.get(
      `/api/customers?${new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        startingAfter: baseline[0].id,
        sortBy: "saleAmount",
      })}`,
    );

    expect({ status, data: error }).toEqual(
      apiError({
        code: "unprocessable_entity",
        message:
          "Cursor-based pagination only supports sorting by `createdAt`. Use offset-based pagination (page/pageSize) for other sort fields.",
      }),
    );
  });
});
