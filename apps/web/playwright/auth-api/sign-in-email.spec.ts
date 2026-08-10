import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
} from "./fixtures";
import { authPost, expectJson, signInWithEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await disconnectFixtures();
});

test.describe("POST /api/auth/sign-in/email", () => {
  test("signs in with valid credentials", async ({ request }) => {
    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{
      user: { email: string };
      token?: string;
    }>(response, 200);

    expect(data.user.email).toBe(AUTH_API_USERS.ok.email);

    const cookies = await request.storageState();
    expect(
      cookies.cookies.some((cookie) =>
        cookie.name.includes("session_token"),
      ),
    ).toBe(true);
  });

  test("rejects wrong password", async ({ request }) => {
    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: "wrong-password",
    });

    const data = await expectJson<{ code?: string; message?: string }>(
      response,
      401,
    );

    expect(data.code ?? data.message).toMatch(/INVALID_EMAIL_OR_PASSWORD|invalid/i);
  });

  test("rejects unknown email", async ({ request }) => {
    const response = await authPost(request, "/sign-in/email", {
      email: "auth-api-missing@dub-internal-test.com",
      password: AUTH_API_PASSWORD,
    });

    expect([401, 403]).toContain(response.status());
  });
});
