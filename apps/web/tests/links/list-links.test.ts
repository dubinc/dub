import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { Link } from "@dub/prisma/client";
import { beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain, url } = E2E_LINK;

test("GET /links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);

  onTestFinished(async () => {
    await h.deleteLink(firstLink.id);
  });

  const { data: firstLink } = await http.post<Link>({
    path: "/links",
    body: { url, domain },
  });

  const { data: links, status } = await http.get<Link[]>({
    path: "/links",
  });

  const linkFound = links.find((l) => l.id === firstLink.id);

  expect(status).toEqual(200);
  expect(links.length).toBeGreaterThanOrEqual(1);
  expect(linkFound).toStrictEqual({
    ...firstLink,
    domain,
    url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${firstLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink.key}?qr=1`,
  });
});

describe.concurrent("/links/** - pagination", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let baseline: Link[];
  let baselineIds: string[];

  const commonQuery = {
    pageSize: "5",
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  beforeAll(async () => {
    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { ...commonQuery, pageSize: "25" },
    });

    expect(status).toEqual(200);

    baseline = data;
    baselineIds = baseline.map((l) => l.id);

    expectSortedByCreatedAt(baseline);
  });

  test("Offset pagination works", async () => {
    const page1 = await http.get<Link[]>({
      path: "/links",
      query: { ...commonQuery, page: "1" },
    });
    const page2 = await http.get<Link[]>({
      path: "/links",
      query: { ...commonQuery, page: "2" },
    });

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);

    expect(page1.data.map((l) => l.id)).toEqual(baselineIds.slice(0, 5));
    expect(page2.data.map((l) => l.id)).toEqual(baselineIds.slice(5, 10));

    expectNoOverlap(page1.data, page2.data);
  });

  test("Cursor forward (startingAfter)", async () => {
    const firstPage = baseline.slice(0, 5);
    const lastId = firstPage[4].id;

    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { pageSize: "5", startingAfter: lastId },
    });

    expect(status).toEqual(200);
    expectSortedByCreatedAt(data);

    expect(data.map((l) => l.id)).toEqual(baselineIds.slice(5, 10));
  });

  test("Cursor backward (endingBefore)", async () => {
    const beforeId = baseline[5].id;

    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { pageSize: "5", endingBefore: beforeId },
    });

    expect(status).toEqual(200);
    expectSortedByCreatedAt(data);

    expect(data.map((l) => l.id)).toEqual(baselineIds.slice(0, 5));
  });

  test("Rejects both startingAfter and endingBefore", async () => {
    const { status, data: error } = await http.get({
      path: "/links",
      query: { pageSize: "5", startingAfter: "id", endingBefore: "id" },
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
      path: "/links",
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
    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { pageSize: "5", startingAfter: "link_invalid_id_12345" },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([]);
  });

  test("Invalid cursor ID (endingBefore) returns empty array", async () => {
    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { pageSize: "5", endingBefore: "link_invalid_id_12345" },
    });

    expect(status).toEqual(200);
    expect(data).toEqual([]);
  });

  // When startingAfter is provided, page should be ignored and cursor pagination should be used
  test("Mixing pagination methods - page with startingAfter ignores page", async () => {
    const firstPage = baseline.slice(0, 5);
    const lastId = firstPage[4].id;

    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { page: "2", pageSize: "5", startingAfter: lastId },
    });

    expect(status).toEqual(200);
    expect(data.map((l) => l.id)).toEqual(baselineIds.slice(5, 10));
  });

  // When endingBefore is provided, page should be ignored and cursor pagination should be used
  test("Mixing pagination methods - page with endingBefore ignores page", async () => {
    const beforeId = baseline[5].id;

    const { status, data } = await http.get<Link[]>({
      path: "/links",
      query: { page: "2", pageSize: "5", endingBefore: beforeId },
    });

    expect(status).toEqual(200);
    expect(data.map((l) => l.id)).toEqual(baselineIds.slice(0, 5));
  });

  test("Sort order asc works correctly", async () => {
    // Get baseline in ascending order
    const { status: baselineStatus, data: ascBaseline } = await http.get<
      Link[]
    >({
      path: "/links",
      query: { pageSize: "25", sortBy: "createdAt", sortOrder: "asc" },
    });

    expect(baselineStatus).toEqual(200);
    expectSortedByCreatedAtAsc(ascBaseline);

    const ascBaselineIds = ascBaseline.map((l) => l.id);

    // Test offset pagination with asc
    const page1 = await http.get<Link[]>({
      path: "/links",
      query: {
        page: "1",
        pageSize: "5",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    const page2 = await http.get<Link[]>({
      path: "/links",
      query: {
        page: "2",
        pageSize: "5",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);

    expect(page1.data.map((l) => l.id)).toEqual(ascBaselineIds.slice(0, 5));
    expect(page2.data.map((l) => l.id)).toEqual(ascBaselineIds.slice(5, 10));

    expectSortedByCreatedAtAsc(page1.data);
    expectSortedByCreatedAtAsc(page2.data);
    expectNoOverlap(page1.data, page2.data);
  });

  test("Cursor pagination with sort order asc", async () => {
    // Get baseline in ascending order
    const { data: ascBaseline } = await http.get<Link[]>({
      path: "/links",
      query: { pageSize: "25", sortBy: "createdAt", sortOrder: "asc" },
    });

    const ascBaselineIds = ascBaseline.map((l) => l.id);
    const firstPage = ascBaseline.slice(0, 5);
    const lastId = firstPage[4].id;

    // Test startingAfter with asc
    const { status: statusAfter, data: dataAfter } = await http.get<Link[]>({
      path: "/links",
      query: {
        pageSize: "5",
        startingAfter: lastId,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(statusAfter).toEqual(200);
    expectSortedByCreatedAtAsc(dataAfter);
    expect(dataAfter.map((l) => l.id)).toEqual(ascBaselineIds.slice(5, 10));

    // Test endingBefore with asc
    const beforeId = ascBaseline[5].id;

    const { status: statusBefore, data: dataBefore } = await http.get<Link[]>({
      path: "/links",
      query: {
        pageSize: "5",
        endingBefore: beforeId,
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    });

    expect(statusBefore).toEqual(200);
    expectSortedByCreatedAtAsc(dataBefore);
    expect(dataBefore.map((l) => l.id)).toEqual(ascBaselineIds.slice(0, 5));
  });
});

function expectSortedByCreatedAt(links: Link[]) {
  for (let i = 0; i < links.length - 1; i++) {
    const a = new Date(links[i].createdAt).getTime();
    const b = new Date(links[i + 1].createdAt).getTime();
    expect(a).toBeGreaterThanOrEqual(b);
  }
}

function expectSortedByCreatedAtAsc(links: Link[]) {
  for (let i = 0; i < links.length - 1; i++) {
    const a = new Date(links[i].createdAt).getTime();
    const b = new Date(links[i + 1].createdAt).getTime();
    expect(a).toBeLessThanOrEqual(b);
  }
}

function expectNoOverlap(a: Link[], b: Link[]) {
  const overlap = a.map((l) => l.id).filter((id) => b.some((x) => x.id === id));
  expect(overlap).toHaveLength(0);
}
