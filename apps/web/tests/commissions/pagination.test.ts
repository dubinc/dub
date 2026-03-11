import { CommissionResponse } from "@/lib/types";
import { beforeAll, describe, expect, test } from "vitest";
import {
  expectNoOverlap,
  expectSortedByCreatedAt,
  expectSortedByCreatedAtAsc,
  expectSortedById,
} from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";

describe.concurrent("/commissions/** - pagination", async () => {
  const h = new IntegrationHarness();
  let http: IntegrationHarness["http"];
  let baseline: CommissionResponse[];
  let baselineIds: string[];

  const commonQuery = {
    pageSize: "5",
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  beforeAll(async () => {
    ({ http } = await h.init());

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
    expect(data).toHaveLength(5);
    expectSortedById(data, "desc");
  });

  test("Cursor backward (endingBefore)", async () => {
    const beforeId = baseline[5].id;

    const { status, data } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query: { pageSize: "5", endingBefore: beforeId },
    });

    expect(status).toEqual(200);
    expect(data).toHaveLength(5);
    expectSortedById(data, "desc");
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

  test("Invalid cursor ID (startingAfter / endingBefore) returns error", async () => {
    const invalidCursorError = {
      error: {
        code: "unprocessable_entity",
        message: "Invalid cursor: the provided ID does not exist.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    };

    const { status: statusAfter, data: errorAfter } = await http.get({
      path: "/commissions",
      query: { pageSize: "5", startingAfter: "cm_invalid_id_12345" },
    });

    expect(statusAfter).toEqual(422);
    expect(errorAfter).toStrictEqual(invalidCursorError);

    const { status: statusBefore, data: errorBefore } = await http.get({
      path: "/commissions",
      query: { pageSize: "5", endingBefore: "cm_invalid_id_12345" },
    });

    expect(statusBefore).toEqual(422);
    expect(errorBefore).toStrictEqual(invalidCursorError);
  });

  test("Rejects mixing page with startingAfter / endingBefore", async () => {
    const mixedPaginationError = {
      error: {
        code: "unprocessable_entity",
        message:
          "You cannot use both page and startingAfter/endingBefore at the same time. Please use one pagination method.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    };

    const firstPage = baseline.slice(0, 5);
    const { status: statusAfter, data: errorAfter } = await http.get({
      path: "/commissions",
      query: { page: "2", pageSize: "5", startingAfter: firstPage[4].id },
    });

    expect(statusAfter).toEqual(422);
    expect(errorAfter).toStrictEqual(mixedPaginationError);

    const { status: statusBefore, data: errorBefore } = await http.get({
      path: "/commissions",
      query: { page: "2", pageSize: "5", endingBefore: baseline[5].id },
    });

    expect(statusBefore).toEqual(422);
    expect(errorBefore).toStrictEqual(mixedPaginationError);
  });

  test("Rejects cursor pagination with unsupported sort field", async () => {
    const { status, data: error } = await http.get({
      path: "/commissions",
      query: {
        pageSize: "5",
        startingAfter: baseline[0].id,
        sortBy: "amount",
      },
    });

    expect(status).toEqual(422);
    expect(error).toStrictEqual({
      error: {
        code: "unprocessable_entity",
        message:
          "Cursor-based pagination only supports sorting by `createdAt`. Use offset-based pagination (page/pageSize) for other sort fields.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("Offset pagination with sort order asc works correctly", async () => {
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
});
