import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_PASSWORD_STRONG,
  AUTH_API_PASSWORD_STRONG_ALT,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
  resetPasswordUserPassword,
} from "./fixtures";
import {
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
  test("requests reset, resets password, and signs in with new password", async ({
    request,
  }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD);
    await clearMailHog();

    const requestReset = await authPost(request, "/request-password-reset", {
      email: AUTH_API_USERS.password.email,
      redirectTo: "http://localhost:8888/auth/reset-password",
    });

    expect(requestReset.status()).toBe(200);

    const email = await waitForAuthEmail(AUTH_API_USERS.password.email);
    const authUrl = extractAuthUrl(email);
    const resetToken = await resolveResetToken(request, authUrl);

    const reset = await authPost(request, "/reset-password", {
      newPassword: AUTH_API_PASSWORD_STRONG,
      token: resetToken,
    });

    expect(reset.status()).toBe(200);

    const signInOld = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD,
    });
    expect(signInOld.status()).toBe(401);

    const signInNew = await signInWithEmail(request, {
      email: AUTH_API_USERS.password.email,
      password: AUTH_API_PASSWORD_STRONG,
    });
    expect(signInNew.status()).toBe(200);
  });

  test("changes password while authenticated", async ({ request }) => {
    await resetPasswordUserPassword(AUTH_API_PASSWORD_STRONG);

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
});
