import { APIRequestContext, expect, test } from "@playwright/test";

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

  test("GET / — partner profile", async ({ request }) => {
    const res = await api(request).get("/");
    expect(res.status()).toBe(200);
  });

  test("GET /programs — sees both programs", async ({ request }) => {
    const res = await api(request).get("/programs");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(2);
  });

  test("GET /programs/acme — accessible", async ({ request }) => {
    const res = await api(request).get("/programs/acme");
    expect(res.status()).toBe(200);
  });

  test("GET /programs/example — accessible", async ({ request }) => {
    const res = await api(request).get("/programs/example");
    expect(res.status()).toBe(200);
  });

  test("GET /programs/acme/links — sees 2 links", async ({ request }) => {
    const res = await api(request).get("/programs/acme/links");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(2);
  });

  test("GET /programs/example/links — sees 2 links", async ({ request }) => {
    const res = await api(request).get("/programs/example/links");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(2);
  });

  test("GET /payouts — accessible", async ({ request }) => {
    const res = await api(request).get("/payouts");
    expect(res.status()).toBe(200);
  });

  test("GET /messages — accessible", async ({ request }) => {
    const res = await api(request).get("/messages");
    expect(res.status()).toBe(200);
  });

  test("GET /users — accessible", async ({ request }) => {
    const res = await api(request).get("/users");
    expect(res.status()).toBe(200);
  });

  test("GET /invites — accessible", async ({ request }) => {
    const res = await api(request).get("/invites");
    expect(res.status()).toBe(200);
  });

  test("PATCH /users — not forbidden (has users.update)", async ({
    request,
  }) => {
    const res = await api(request).patch("/users", {});
    expect(res.status()).not.toBe(403);
  });

  test("POST /invites — not forbidden (has user_invites.create)", async ({
    request,
  }) => {
    const res = await api(request).post("/invites", {});
    expect(res.status()).not.toBe(403);
  });

  test("PATCH /invites — not forbidden (has user_invites.update)", async ({
    request,
  }) => {
    const res = await api(request).patch("/invites", {});
    expect(res.status()).not.toBe(403);
  });

  test("DELETE /invites — not forbidden (has user_invites.delete)", async ({
    request,
  }) => {
    const res = await api(request).delete(
      "/invites?email=fake@nonexistent.com",
    );
    expect(res.status()).not.toBe(403);
  });

  test("DELETE /users — not forbidden (has users.delete)", async ({
    request,
  }) => {
    const res = await api(request).delete("/users?userId=fake_user_id");
    expect(res.status()).not.toBe(403);
  });
});
