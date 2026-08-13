import { expect, test } from "@playwright/test";
import {
  AUTH_API_PASSWORD,
  AUTH_API_USERS,
  disconnectFixtures,
  ensureAuthApiFixtures,
} from "./fixtures";
import { authGet, authPost, expectJson, signInWithEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureAuthApiFixtures();
});

test.afterAll(async () => {
  await disconnectFixtures();
});

test.describe("session endpoints", () => {
  test("get-session is null when unauthenticated", async ({ request }) => {
    const response = await authGet(request, "/get-session");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeNull();
  });

  test("get-session returns user after sign-in", async ({ request }) => {
    await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });

    const response = await authGet(request, "/get-session");
    const data = await expectJson<{
      user: { email: string };
      session: { token: string };
    }>(response, 200);

    expect(data.user.email).toBe(AUTH_API_USERS.ok.email);
    expect(data.session.token).toBeTruthy();
  });

  test("sign-out clears the session", async ({ request }) => {
    await signInWithEmail(request, {
      email: AUTH_API_USERS.ok.email,
      password: AUTH_API_PASSWORD,
    });

    const signOut = await authPost(request, "/sign-out");
    expect(signOut.status()).toBe(200);

    const session = await authGet(request, "/get-session");
    expect(session.status()).toBe(200);
    expect(await session.json()).toBeNull();
  });
});
