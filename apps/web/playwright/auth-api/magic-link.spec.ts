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
  test("sends and verifies a magic link for an existing user", async ({
    request,
  }) => {
    await clearMailHog();

    const send = await authPost(request, "/sign-in/magic-link", {
      email: AUTH_API_USERS.magic.email,
      callbackURL: "http://localhost:8888/workspaces",
    });

    expect(send.status()).toBe(200);

    const email = await waitForAuthEmail(AUTH_API_USERS.magic.email);
    const authUrl = extractAuthUrl(email);
    expect(authUrl).toContain("/api/auth/magic-link/verify");
    expect(authUrl).toContain("token=");

    const token = extractTokenFromAuthUrl(authUrl);

    // Omit callbackURL so Better Auth returns JSON instead of redirecting.
    const verify = await authGet(request, "/magic-link/verify", { token });
    const data = await expectJson<{
      user: { email: string };
      token?: string;
    }>(verify, 200);

    expect(data.user.email).toBe(AUTH_API_USERS.magic.email);
    expect(data.token).toBeTruthy();

    const session = await authGet(request, "/get-session");
    const sessionData = await expectJson<{
      user: { email: string };
    }>(session, 200);
    expect(sessionData.user.email).toBe(AUTH_API_USERS.magic.email);
  });

  test("does not create a session for unknown emails (disableSignUp)", async ({
    request,
  }) => {
    await clearMailHog();

    const send = await authPost(request, "/sign-in/magic-link", {
      email: "auth-api-nosuch-user@dub-internal-test.com",
      callbackURL: "http://localhost:8888/workspaces",
    });

    // BA may still accept the send request; signup is blocked at verify.
    expect([200, 400, 401, 403, 404]).toContain(send.status());

    if (send.status() === 200) {
      // If an email was sent, verify must not create a user/session.
      try {
        const email = await waitForAuthEmail(
          "auth-api-nosuch-user@dub-internal-test.com",
          { timeout: 5_000 },
        );
        const token = extractTokenFromAuthUrl(extractAuthUrl(email));
        const verify = await request.get(
          `/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
          { maxRedirects: 0 },
        );
        expect([302, 307, 400, 401, 403]).toContain(verify.status());
        const location = verify.headers().location ?? "";
        if (location) {
          expect(location).toMatch(/error=/i);
        }
      } catch {
        // No email is also acceptable when the user does not exist.
      }
    }

    const session = await authGet(request, "/get-session");
    expect(await session.json()).toBeNull();
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
