import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_PASSWORD_STRONG,
  AUTH_API_PASSWORD_STRONG_ALT,
  AUTH_API_USERS,
  countUserSessions,
  disconnectFixtures,
  ensureAuthApiFixtures,
  getUserAuthState,
  resetPasswordUserPassword,
} from "./fixtures";
import {
  authGet,
  authPost,
  clearMailHog,
  expectJson,
  extractAuthUrl,
  extractTokenFromAuthUrl,
  signInWithEmail,
  waitForAuthEmail,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await resetPasswordUserPassword(AUTH_API_PASSWORD);
  await disconnectFixtures();
});

async function resolveResetToken(
  request: Parameters<typeof authPost>[0],
  authUrl: string,
) {
  let resetToken = extractTokenFromAuthUrl(authUrl);

  if (authUrl.includes("/api/auth/reset-password/")) {
    const callback = await request.get(authUrl, { maxRedirects: 0 });
    const location = callback.headers().location;
    if (location) {
      resetToken =
        new URL(location, "http://localhost:8888").searchParams.get("token") ??
        resetToken;
    }
  }

  return resetToken;
}

test.describe("password reset and change", () => {
  test("requests reset, resets password, revokes sessions, and allows new sign-in", async ({
    playwright,
    request,
  }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD);
    await clearMailHog();

    // Establish a session that should be revoked on reset.
    const existingSession = await playwright.request.newContext({
      baseURL: "http://localhost:8888",
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        Origin: "http://localhost:8888",
      },
    });
    const priorSignIn = await signInWithEmail(existingSession, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD,
    });
    expect(priorSignIn.status()).toBe(200);
    const priorSession = await authGet(existingSession, "/get-session");
    const priorSessionBody = await priorSession.json();
    expect(priorSessionBody?.user?.email).toBe(AUTH_API_USERS.password.email);
    const userId = priorSessionBody.user.id as string;
    expect(await countUserSessions(userId)).toBeGreaterThan(0);

    const requestReset = await authPost(request, "/request-password-reset", {
      email: AUTH_API_USERS.password.email,
      redirectTo: "http://localhost:8888/auth/reset-password",
    });

    expect(requestReset.status()).toBe(200);

    const email = await waitForAuthEmail(AUTH_API_USERS.password.email);
    const authUrl = extractAuthUrl(email);
    expect(authUrl).toContain("reset-password");
    const resetToken = await resolveResetToken(request, authUrl);

    const reset = await authPost(request, "/reset-password", {
      newPassword: AUTH_API_PASSWORD_STRONG,
      token: resetToken,
    });

    expect(reset.status()).toBe(200);

    // Old password must fail.
    const signInOld = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD,
    });
    expect(signInOld.status()).toBe(401);

    // DB sessions are revoked (cookieCache may still serve get-session briefly).
    expect(await countUserSessions(userId)).toBe(0);
    await existingSession.dispose();

    // New password works.
    const signInNew = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD_STRONG,
    });
    expect(signInNew.status()).toBe(200);

    // onPasswordReset clears lock counters.
    const state = await getUserAuthState(AUTH_API_USERS.password.email);
    expect(state.invalidLoginAttempts).toBe(0);
    expect(state.lockedAt).toBeNull();
  });

  test("changes password while authenticated and sends update email", async ({
    request,
  }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD_STRONG);
    await clearMailHog();

    const signIn = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD_STRONG,
    });
    expect(signIn.status()).toBe(200);

    const change = await authPost(request, "/change-password", {
      currentPassword: AUTH_API_PASSWORD_STRONG,
      newPassword: AUTH_API_PASSWORD_STRONG_ALT,
      revokeOtherSessions: true,
    });

    expect(change.status()).toBe(200);

    const updateEmail = await waitForAuthEmail(AUTH_API_USERS.password.email);
    expect(updateEmail.Content.Headers.Subject?.join(" ") ?? "").toMatch(
      /password has been updated/i,
    );

    await authPost(request, "/sign-out");

    const signInUpdated = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD_STRONG_ALT,
    });
    expect(signInUpdated.status()).toBe(200);
  });

  test("rejects weak new password on change-password", async ({ request }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD);

    const signIn = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD,
    });
    expect(signIn.status()).toBe(200);

    const change = await authPost(request, "/change-password", {
      currentPassword: AUTH_API_PASSWORD,
      newPassword: "weak",
    });

    const data = await expectJson<{ code?: string; message?: string }>(
      change,
      400,
    );

    expect(data.code).toBe("PASSWORD_REQUIREMENTS_NOT_MET");
  });

  test("rejects weak new password on reset-password", async ({ request }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD);
    await clearMailHog();

    await authPost(request, "/request-password-reset", {
      email: AUTH_API_USERS.password.email,
      redirectTo: "http://localhost:8888/auth/reset-password",
    });

    const email = await waitForAuthEmail(AUTH_API_USERS.password.email);
    const authUrl = extractAuthUrl(email);
    const resetToken = await resolveResetToken(request, authUrl);

    const reset = await authPost(request, "/reset-password", {
      newPassword: "weak",
      token: resetToken,
    });

    const data = await expectJson<{ code?: string }>(reset, 400);
    expect(data.code).toBe("PASSWORD_REQUIREMENTS_NOT_MET");
  });

  test("rejects change-password without a session", async ({ request }) => {
    const change = await authPost(request, "/change-password", {
      currentPassword: AUTH_API_PASSWORD,
      newPassword: AUTH_API_PASSWORD_STRONG,
    });

    expect([401, 403]).toContain(change.status());
  });
});
