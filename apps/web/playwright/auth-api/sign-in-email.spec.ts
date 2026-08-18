import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
  getUserAuthState,
  MAX_LOGIN_ATTEMPTS,
  setOkUserLoginAttempts,
} from "./fixtures";
import { authPost, expectJson, signInWithEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await setOkUserLoginAttempts(0);
  await disconnectFixtures();
});

test.describe("POST /api/auth/sign-in/email", () => {
  test("signs in with valid credentials", async ({ request }) => {
    await setOkUserLoginAttempts(0);

    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{
      user: { email: string; id: string };
      token: string;
    }>(response, 200);

    expect(data.user.email).toBe(AUTH_API_USERS.ok.email);
    expect(data.token).toBeTruthy();

    const cookies = await request.storageState();
    expect(
      cookies.cookies.some((cookie) => cookie.name.includes("session_token")),
    ).toBe(true);
  });

  test("rejects wrong password with INVALID_EMAIL_OR_PASSWORD", async ({
    request,
  }) => {
    await setOkUserLoginAttempts(0);

    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: "wrong-password",
    });

    const data = await expectJson<{ code?: string }>(response, 401);
    expect(data.code).toBe("INVALID_EMAIL_OR_PASSWORD");

    const state = await getUserAuthState(AUTH_API_USERS.ok.email);
    expect(state.invalidLoginAttempts).toBe(1);
  });

  test("rejects unknown email with INVALID_EMAIL_OR_PASSWORD", async ({
    request,
  }) => {
    const response = await authPost(request, "/sign-in/email", {
      email: "auth-api-missing@dub-internal-test.com",
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{ code?: string }>(response, 401);
    expect(data.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  test("locks the account after MAX_LOGIN_ATTEMPTS failures", async ({
    request,
  }) => {
    await setOkUserLoginAttempts(MAX_LOGIN_ATTEMPTS - 1);

    // The failing attempt that crosses the threshold may still return 401;
    // the after-hook increments/locks, and the next request is blocked in before.
    const crossing = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: "wrong-password",
    });
    expect([401, 403]).toContain(crossing.status());

    const state = await getUserAuthState(AUTH_API_USERS.ok.email);
    expect(state.invalidLoginAttempts).toBeGreaterThanOrEqual(
      MAX_LOGIN_ATTEMPTS,
    );
    expect(state.lockedAt).not.toBeNull();

    const blocked = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });
    const data = await expectJson<{ message?: string }>(blocked, 403);
    expect(data.message).toBe("exceeded-login-attempts");

    // Cleanup so later specs can use the ok user.
    await setOkUserLoginAttempts(0);
  });

  test("successful sign-in resets invalidLoginAttempts", async ({
    request,
  }) => {
    await setOkUserLoginAttempts(3);

    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });
    expect(response.status()).toBe(200);

    const state = await getUserAuthState(AUTH_API_USERS.ok.email);
    expect(state.invalidLoginAttempts).toBe(0);
    expect(state.lockedAt).toBeNull();
  });
});
