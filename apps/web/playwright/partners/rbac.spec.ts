import { APIRequestContext, expect, test } from "@playwright/test";
import { PARTNER_LINKS, PARTNER_PROGRAMS } from "./constants";

test.describe.configure({ mode: "parallel" });

const BASE_URL = "http://partners.localhost:8888";

function api(request: APIRequestContext) {
  return {
    get: (path: string) =>
      request.get(`${BASE_URL}/api/partner-profile${path}`),
    post: (path: string, data?: object) =>
      request.post(`${BASE_URL}/api/partner-profile${path}`, { data }),
    patch: (path: string, data?: object) =>
      request.patch(`${BASE_URL}/api/partner-profile${path}`, { data }),
    delete: (path: string) =>
      request.delete(`${BASE_URL}/api/partner-profile${path}`),
  };
}

// Owner role
test.describe("Owner role", () => {
  test.use({ storageState: "playwright/.auth/partner-owner.json" });

  const accessibleEndpoints = [
    "/",
    "/payouts",
    "/messages",
    "/users",
    "/programs/acme",
    "/programs?status=invited",
    "/programs/acme/earnings",
    "/programs/acme/analytics",
    "/programs/acme/events",
    "/programs/acme/customers",
    "/programs/acme/bounties",
    "/programs/acme/resources",
  ];

  for (const endpoint of accessibleEndpoints) {
    test(`GET ${endpoint} — accessible`, async ({ request }) => {
      const response = await api(request).get(endpoint);
      expect(response.status()).toBe(200);
    });
  }

  test("GET /api/network/programs — accessible (program marketplace)", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/network/programs`);
    expect(response.status()).toBe(200);
  });

  test("GET /programs — sees both programs", async ({ request }) => {
    const response = await api(request).get("/programs");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(2);

    const slugs = body
      .map((p: { program: { slug: string } }) => p.program.slug)
      .sort();
    expect(slugs).toEqual([...PARTNER_PROGRAMS].sort());
  });

  test("GET /programs/acme/links — sees 2 links", async ({ request }) => {
    const response = await api(request).get("/programs/acme/links");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(2);

    const keys = body.map((l: { key: string }) => l.key).sort();
    expect(keys).toEqual(PARTNER_LINKS.acme.map((l) => l.key).sort());
  });
});

// Member role (restricted to acme program, acme-link-1 only)
test.describe("Member role", () => {
  test.use({ storageState: "playwright/.auth/partner-member.json" });

  const accessibleEndpoints = [
    "/",
    "/payouts",
    "/messages",
    "/users",
    "/programs/acme",
    "/programs?status=invited",
    "/programs/acme/earnings",
    "/programs/acme/analytics",
    "/programs/acme/events",
    "/programs/acme/customers",
    "/programs/acme/bounties",
    "/programs/acme/resources",
  ];

  for (const endpoint of accessibleEndpoints) {
    test(`GET ${endpoint} — accessible`, async ({ request }) => {
      const response = await api(request).get(endpoint);
      expect(response.status()).toBe(200);
    });
  }

  test("GET /api/network/programs — accessible (program marketplace)", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/network/programs`);
    expect(response.status()).toBe(200);
  });

  test("GET /programs — sees only acme", async ({ request }) => {
    const response = await api(request).get("/programs");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(1);

    const slugs = body.map(
      (p: { program: { slug: string } }) => p.program.slug,
    );
    expect(slugs).toEqual(["acme"]);
  });

  test("GET /programs/example — not accessible", async ({ request }) => {
    const response = await api(request).get("/programs/example");
    expect(response.status()).toBe(404);
  });

  test("GET /programs/acme/links — sees only acme-link-1", async ({
    request,
  }) => {
    const response = await api(request).get("/programs/acme/links");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBe(1);

    const keys = body.map((l: { key: string }) => l.key);
    expect(keys).toEqual(["acme-link-1"]);
  });

  const unauthorizedLinkIdEndpoints = [
    { endpoint: "/programs/acme/earnings", expectedStatus: 403 },
    { endpoint: "/programs/acme/customers", expectedStatus: 403 },
    { endpoint: "/programs/acme/analytics", expectedStatus: 404 },
    { endpoint: "/programs/acme/events", expectedStatus: 404 },
  ];

  for (const { endpoint, expectedStatus } of unauthorizedLinkIdEndpoints) {
    test(`GET ${endpoint}?linkId=... — denied for unassigned link`, async ({
      request,
    }) => {
      const response = await api(request).get(`${endpoint}?linkId=acme-link-2`);
      expect(response.status()).toBe(expectedStatus);
    });
  }
});
