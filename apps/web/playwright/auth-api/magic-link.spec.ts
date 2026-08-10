import { expect, test } from "@playwright/test";
import {
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
} from "./fixtures";
import {
  authGet,
  authPost,
  clearMailHog,
  expectJson,
  extractAuthUrl,
  extractTokenFromAuthUrl,
  waitForAuthEmail,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await disconnectFixtures();
});

test.describe("magic link", () => {
  test("sends and verifies a magic link", async ({ request }) => {
    await clearMailHog();

    const send = await authPost(request, "/sign-in/magic-link", {
      email: AUTH_API_USERS.ok.email,
      callbackURL: "http://localhost:8888/workspaces",
    });

    expect(send.status()).toBe(200);

    const email = await waitForAuthEmail(AUTH_API_USERS.ok.email);
    const authUrl = extractAuthUrl(email);
    const token = extractTokenFromAuthUrl(authUrl);

    // Omit callbackURL so Better Auth returns JSON instead of redirecting.
    const verify = await authGet(request, "/magic-link/verify", { token });
    const data = await expectJson<{
      user: { email: string };
      token?: string;
    }>(verify, 200);

    expect(data.user.email).toBe(AUTH_API_USERS.ok.email);

    const session = await authGet(request, "/get-session");
    const sessionData = await expectJson<{
      user: { email: string };
    }>(session, 200);
    expect(sessionData.user.email).toBe(AUTH_API_USERS.ok.email);
  });

  test("rejects an invalid magic-link token", async ({ request }) => {
    const verify = await request.get(
      "/api/auth/magic-link/verify?token=definitely-not-a-valid-token",
      { maxRedirects: 0 },
    );

    expect([302, 307]).toContain(verify.status());
    const location = verify.headers().location ?? "";
    expect(location).toContain("error=INVALID_TOKEN");

    const session = await authGet(request, "/get-session");
    expect(await session.json()).toBeNull();
  });
});
