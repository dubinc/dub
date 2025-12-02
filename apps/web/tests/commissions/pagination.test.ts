import { CommissionResponse } from "@/lib/types";
import { beforeAll, describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("/commissions/** - pagination", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let baseline: CommissionResponse[];
  let baselineIds: string[];

  const commonQuery = {
    pageSize: "5",
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  beforeAll(async () => {
    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { ...commonQuery, pageSize: "25" },
    });

    expect(status).toEqual(200);

    baseline = data;
    baselineIds = baseline.map((c) => c.id);
    expectSortedByCreatedAt(baseline);
  });

  test("Offset pagination works", async () => {
    const page1 = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { ...commonQuery, page: "1" },
    });
    const page2 = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { ...commonQuery, page: "2" },
    });

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);

    expect(page1.data.map((c) => c.id)).toEqual(baselineIds.slice(0, 5));
    expect(page2.data.map((c) => c.id)).toEqual(baselineIds.slice(5, 10));

    expectNoOverlap(page1.data, page2.data);
  });

  test("Cursor forward (startingAfter)", async () => {
    const firstPage = baseline.slice(0, 5);
    const lastId = firstPage[4].id;

    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { pageSize: "5", startingAfter: lastId },
    });

    expect(status).toEqual(200);
    expectSortedByCreatedAt(data);

    expect(data.map((c) => c.id)).toEqual(baselineIds.slice(5, 10));
  });

  test("Cursor backward (endingBefore)", async () => {
    const beforeId = baseline[5].id;

    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { pageSize: "5", endingBefore: beforeId },
    });

    expect(status).toEqual(200);
    expectSortedByCreatedAt(data);

    expect(data.map((c) => c.id)).toEqual(baselineIds.slice(0, 5));
  });

  test("Rejects both startingAfter and endingBefore", async () => {
    const { status, data: error } = await http.get({
      path: "/commissions",
      query: {
        pageSize: "5",
        startingAfter: "id",
        endingBefore: "id",
      },
    });

    expect(status).toEqual(422);
    expect(error).toStrictEqual({
      error: {
        code: "unprocessable_entity",
        message:
          "You cannot use both startingAfter and endingBefore at the same time.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("Rejects page > MAX_PAGE_SIZE", async () => {
    const { status, data: error } = await http.get({
      path: "/commissions",
      query: { page: "101", pageSize: "10" },
    });

    expect(status).toEqual(422);
    expect(error).toStrictEqual({
      error: {
        code: "unprocessable_entity",
        message:
          "Page is too big (cannot be more than 100), recommend using cursor-based pagination instead.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("Invalid cursor ID (startingAfter) returns empty array", async () => {
    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        pageSize: "5",
        startingAfter: "cm_invalid_id_12345",
      },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([]);
  });

  test("Invalid cursor ID (endingBefore) returns empty array", async () => {
    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        pageSize: "5",
        endingBefore: "cm_invalid_id_12345",
      },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([]);
  });

  // When startingAfter is provided, page should be ignored and cursor pagination should be used
  test("Mixing pagination methods - page with startingAfter ignores page", async () => {
    const firstPage = baseline.slice(0, 5);
    const lastId = firstPage[4].id;

    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        page: "2",
        pageSize: "5",
        startingAfter: lastId,
      },
    });

    expect(status).toEqual(200);
    expect(data.map((c) => c.id)).toEqual(baselineIds.slice(5, 10));
  });

  // When endingBefore is provided, page should be ignored and cursor pagination should be used
  test("Mixing pagination methods - page with endingBefore ignores page", async () => {
    const beforeId = baseline[5].id;

    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        page: "2",
        pageSize: "5",
        endingBefore: beforeId,
      },
    });

    expect(status).toEqual(200);
    expect(data.map((c) => c.id)).toEqual(baselineIds.slice(0, 5));
  });

  test("Sort order asc works correctly", async () => {
    // Get baseline in ascending order
    const { status: baselineStatus, data: ascBaseline } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        pageSize: "25",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(baselineStatus).toEqual(200);
    expectSortedByCreatedAtAsc(ascBaseline);

    const ascBaselineIds = ascBaseline.map((c) => c.id);

    // Test offset pagination with asc
    const page1 = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        page: "1",
        pageSize: "5",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    const page2 = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        page: "2",
        pageSize: "5",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);

    expect(page1.data.map((c) => c.id)).toEqual(ascBaselineIds.slice(0, 5));
    expect(page2.data.map((c) => c.id)).toEqual(ascBaselineIds.slice(5, 10));

    expectSortedByCreatedAtAsc(page1.data);
    expectSortedByCreatedAtAsc(page2.data);
    expectNoOverlap(page1.data, page2.data);
  });

  test("Cursor pagination with sort order asc", async () => {
    // Get baseline in ascending order
    const { data: ascBaseline } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: {
        pageSize: "25",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    const ascBaselineIds = ascBaseline.map((c) => c.id);
    const firstPage = ascBaseline.slice(0, 5);
    const lastId = firstPage[4].id;

    // Test startingAfter with asc
    const { status: statusAfter, data: dataAfter } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        pageSize: "5",
        startingAfter: lastId,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(statusAfter).toEqual(200);
    expectSortedByCreatedAtAsc(dataAfter);
    expect(dataAfter.map((c) => c.id)).toEqual(ascBaselineIds.slice(5, 10));

    // Test endingBefore with asc
    const beforeId = ascBaseline[5].id;

    const { status: statusBefore, data: dataBefore } = await http.get<
      CommissionResponse[]
    >({
      path: "/commissions",
      query: {
        pageSize: "5",
        endingBefore: beforeId,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(statusBefore).toEqual(200);
    expectSortedByCreatedAtAsc(dataBefore);
    expect(dataBefore.map((c) => c.id)).toEqual(ascBaselineIds.slice(0, 5));
  });
});

function expectSortedByCreatedAt(commissions: CommissionResponse[]) {
  for (let i = 0; i < commissions.length - 1; i++) {
    const a = new Date(commissions[i].createdAt).getTime();
    const b = new Date(commissions[i + 1].createdAt).getTime();
    expect(a).toBeGreaterThanOrEqual(b);
  }
}

function expectSortedByCreatedAtAsc(commissions: CommissionResponse[]) {
  for (let i = 0; i < commissions.length - 1; i++) {
    const a = new Date(commissions[i].createdAt).getTime();
    const b = new Date(commissions[i + 1].createdAt).getTime();
    expect(a).toBeLessThanOrEqual(b);
  }
}

function expectNoOverlap(a: CommissionResponse[], b: CommissionResponse[]) {
  const overlap = a.map((c) => c.id).filter((id) => b.some((x) => x.id === id));
  expect(overlap).toHaveLength(0);
}
