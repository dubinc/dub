import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
  resetLockedUserState,
} from "./fixtures";
import { authGet, authPost, expectJson, signInWithEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await disconnectFixtures();
});

const ACTION_TOKEN_PREFIXES = [
  "email-change:",
  "signup:",
  "merge-partner-accounts:",
] as const;

test.describe("Better Auth custom hooks", () => {
  test("blocks locked accounts on password sign-in", async ({ request }) => {
    await resetLockedUserState();

    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.locked.email,
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{ message?: string; code?: string }>(
      response,
      403,
    );

    expect(data.message).toBe("exceeded-login-attempts");
  });

  test("blocks password login when email is unverified", async ({
    request,
  }) => {
    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.unverified.email,
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{ message?: string }>(response, 403);
    expect(data.message).toBe("email-not-verified");
  });

  test("requires SAML SSO for enforced email domains on password sign-in", async ({
    request,
  }) => {
    const response = await signInWithEmail(request, {
      email: AUTH_API_USERS.saml.email,
      password: AUTH_API_PASSWORD,
    });

    const data = await expectJson<{ code?: string; message?: string }>(
      response,
      403,
    );

    expect(data.code).toBe("REQUIRE_SAML_SSO");
    expect(data.message).toContain("SAML SSO is required");
  });

  test("requires SAML SSO for enforced email domains on magic-link send", async ({
    request,
  }) => {
    const response = await authPost(request, "/sign-in/magic-link", {
      email: AUTH_API_USERS.saml.email,
      callbackURL: "http://localhost:8888/workspaces",
    });

    const data = await expectJson<{ code?: string }>(response, 403);
    expect(data.code).toBe("REQUIRE_SAML_SSO");
  });

  test("rejects all action verification token prefixes on magic-link verify", async ({
    request,
  }) => {
    for (const prefix of ACTION_TOKEN_PREFIXES) {
      const verify = await authGet(request, "/magic-link/verify", {
        token: `${prefix}fake-token`,
      });
      const data = await expectJson<{ code?: string; message?: string }>(
        verify,
        401,
      );

      expect(data.code).toBe("INVALID_TOKEN");

      const session = await authGet(request, "/get-session");
      expect(await session.json()).toBeNull();
    }
  });

  test("blocks locked accounts on magic-link send", async ({ request }) => {
    await resetLockedUserState();

    const response = await authPost(request, "/sign-in/magic-link", {
      email: AUTH_API_USERS.locked.email,
      callbackURL: "http://localhost:8888/workspaces",
    });

    const data = await expectJson<{ message?: string }>(response, 403);
    expect(data.message).toBe("exceeded-login-attempts");
  });
});
