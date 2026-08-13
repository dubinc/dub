import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
  resetLockedUserState,
} from "./fixtures";
import { authPost, expectJson, signInWithEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await disconnectFixtures();
});

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
