import { generateCodeChallengeHash, generateCodeVerifier } from "@/lib/api/oauth/utils";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

// Existing OAuth app constants
// These apps should exist in the test database
const OAUTH_APP_SERVER_FLOW = {
  clientId: "dub_app_test_server_flow_123",
  clientSecret: "dub_app_secret_test_server_secret_456",
  redirectUri: "https://example.com/oauth/callback",
  pkce: false,
} as const;

const OAUTH_APP_PKCE_FLOW = {
  clientId: "dub_app_test_pkce_flow_789",
  redirectUri: "https://example.com/oauth/callback",
  pkce: true,
} as const;

describe.sequential("OAuth - Server Flow (with client_secret)", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, env } = await h.init();

  let authorizationCode: string;
  let accessToken: string;
  let refreshToken: string;

  test("POST /oauth/authorize - create authorization code", async () => {
    const { status, data } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read links.write",
        state: "random_state_123",
      },
    });

    expect(status).toEqual(200);
    expect(data.callbackUrl).toBeDefined();

    // Parse the callback URL to extract the authorization code
    const callbackUrl = new URL(data.callbackUrl);
    authorizationCode = callbackUrl.searchParams.get("code")!;
    const state = callbackUrl.searchParams.get("state");

    expect(authorizationCode).toBeDefined();
    expect(authorizationCode).toHaveLength(80); // 40 bytes in hex = 80 chars
    expect(state).toEqual("random_state_123");
    expect(callbackUrl.origin + callbackUrl.pathname).toEqual(
      OAUTH_APP_SERVER_FLOW.redirectUri,
    );
  });

  test("POST /oauth/token - exchange code for access token", async () => {
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("code", authorizationCode);
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(200);

    const data = await response.json();

    expect(data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      expires_in: 7200, // 2 hours
      scope: "links.read links.write user.read",
    });

    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    expect(accessToken).toMatch(/^dub_access_token_/);
    expect(accessToken).toHaveLength(17 + 80); // prefix + 40 bytes hex
    expect(refreshToken).toHaveLength(80); // 40 bytes in hex
  });

  test("GET /links - verify access token works", async () => {
    const { status } = await http.get({
      path: "/links",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(status).toEqual(200);
  });

  test("POST /oauth/token - refresh access token", async () => {
    const formData = new FormData();
    formData.append("grant_type", "refresh_token");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("refresh_token", refreshToken);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(200);

    const data = await response.json();

    expect(data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      expires_in: 7200,
    });

    // New tokens should be different from old ones
    expect(data.access_token).not.toEqual(accessToken);
    expect(data.refresh_token).not.toEqual(refreshToken);

    // Old access token should no longer work
    const { status: oldTokenStatus } = await http.get({
      path: "/links",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(oldTokenStatus).toEqual(401);

    // New access token should work
    const { status: newTokenStatus } = await http.get({
      path: "/links",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    expect(newTokenStatus).toEqual(200);
  });

  test("POST /oauth/token - exchange code with Basic Auth", async () => {
    // First get a new authorization code
    const { data: authorizeData } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read",
      },
    });

    const callbackUrl = new URL(authorizeData.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    // Exchange code using Basic Auth
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("code", code);
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const basicAuth = Buffer.from(
      `${OAUTH_APP_SERVER_FLOW.clientId}:${OAUTH_APP_SERVER_FLOW.clientSecret}`,
    ).toString("base64");

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
      body: formData,
    });

    expect(response.status).toEqual(200);

    const data = await response.json();
    expect(data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
    });
  });
});

describe.sequential("OAuth - PKCE Flow (without client_secret)", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, env } = await h.init();

  let authorizationCode: string;
  let accessToken: string;
  let refreshToken: string;
  let codeVerifier: string;
  let codeChallenge: string;

  test("POST /oauth/authorize - create authorization code with PKCE", async () => {
    // Generate PKCE parameters
    codeVerifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallengeHash(codeVerifier);

    const { status, data } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_PKCE_FLOW.clientId,
        redirect_uri: OAUTH_APP_PKCE_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read links.write workspaces.read",
        state: "pkce_state_456",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      },
    });

    expect(status).toEqual(200);
    expect(data.callbackUrl).toBeDefined();

    // Parse the callback URL to extract the authorization code
    const callbackUrl = new URL(data.callbackUrl);
    authorizationCode = callbackUrl.searchParams.get("code")!;
    const state = callbackUrl.searchParams.get("state");

    expect(authorizationCode).toBeDefined();
    expect(authorizationCode).toHaveLength(80);
    expect(state).toEqual("pkce_state_456");
  });

  test("POST /oauth/token - exchange code for access token with PKCE", async () => {
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_PKCE_FLOW.clientId);
    formData.append("code", authorizationCode);
    formData.append("redirect_uri", OAUTH_APP_PKCE_FLOW.redirectUri);
    formData.append("code_verifier", codeVerifier);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(200);

    const data = await response.json();

    expect(data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      expires_in: 7200,
      scope: "links.read links.write workspaces.read user.read",
    });

    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    expect(accessToken).toMatch(/^dub_access_token_/);
  });

  test("GET /links - verify PKCE access token works", async () => {
    const { status } = await http.get({
      path: "/links",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(status).toEqual(200);
  });

  test("POST /oauth/token - refresh access token with PKCE", async () => {
    const formData = new FormData();
    formData.append("grant_type", "refresh_token");
    formData.append("client_id", OAUTH_APP_PKCE_FLOW.clientId);
    formData.append("refresh_token", refreshToken);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(200);

    const data = await response.json();

    expect(data).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      expires_in: 7200,
    });

    expect(data.access_token).not.toEqual(accessToken);
    expect(data.refresh_token).not.toEqual(refreshToken);

    // Verify new token works
    const { status: newTokenStatus } = await http.get({
      path: "/links",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    expect(newTokenStatus).toEqual(200);
  });

  test("POST /oauth/token - fail with invalid code_verifier", async () => {
    // Get a new authorization code
    const newCodeVerifier = generateCodeVerifier();
    const newCodeChallenge = await generateCodeChallengeHash(newCodeVerifier);

    const { data: authorizeData } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_PKCE_FLOW.clientId,
        redirect_uri: OAUTH_APP_PKCE_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read",
        code_challenge: newCodeChallenge,
        code_challenge_method: "S256",
      },
    });

    const callbackUrl = new URL(authorizeData.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    // Try to exchange with wrong code_verifier
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_PKCE_FLOW.clientId);
    formData.append("code", code);
    formData.append("redirect_uri", OAUTH_APP_PKCE_FLOW.redirectUri);
    formData.append("code_verifier", "wrong_verifier");

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(401);

    const data = await response.json();
    expect(data.error.message).toEqual("invalid_grant");
  });
});

describe.sequential("OAuth - Error Cases", async () => {
  const h = new IntegrationHarness();
  const { http, env } = await h.init();

  test("POST /oauth/authorize - fail with invalid redirect_uri", async () => {
    const { status, data } = await http.post({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: "https://evil.com/callback",
        response_type: "code",
        scope: "links.read",
      },
    });

    expect(status).toEqual(400);
    expect(data.error.message).toContain("Invalid redirect_uri");
  });

  test("POST /oauth/authorize - fail without PKCE params when required", async () => {
    const { status, data } = await http.post({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_PKCE_FLOW.clientId,
        redirect_uri: OAUTH_APP_PKCE_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read",
        // Missing code_challenge and code_challenge_method
      },
    });

    expect(status).toEqual(400);
    expect(data.error.message).toContain(
      "Missing code_challenge or code_challenge_method",
    );
  });

  test("POST /oauth/token - fail with invalid code", async () => {
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("code", "invalid_code_123");
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(401);

    const data = await response.json();
    expect(data.error.message).toEqual("Invalid code");
  });

  test("POST /oauth/token - fail with invalid client_secret", async () => {
    // First get a valid authorization code
    const { data: authorizeData } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read",
      },
    });

    const callbackUrl = new URL(authorizeData.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    // Try to exchange with wrong client_secret
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", "wrong_secret");
    formData.append("code", code);
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(401);

    const data = await response.json();
    expect(data.error.message).toEqual("Invalid client_secret");
  });

  test("POST /oauth/token - fail with mismatched redirect_uri", async () => {
    // Get a valid authorization code
    const { data: authorizeData } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read",
      },
    });

    const callbackUrl = new URL(authorizeData.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    // Try to exchange with different redirect_uri
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("code", code);
    formData.append("redirect_uri", "https://different.com/callback");

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(400);

    const data = await response.json();
    expect(data.error.message).toEqual("redirect_uri does not match");
  });

  test("POST /oauth/token - fail with invalid refresh_token", async () => {
    const formData = new FormData();
    formData.append("grant_type", "refresh_token");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("refresh_token", "invalid_refresh_token");

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    expect(response.status).toEqual(401);

    const data = await response.json();
    expect(data.error.message).toEqual("Refresh token not found.");
  });

  test("POST /oauth/authorize - fail with invalid scope", async () => {
    const { status, data } = await http.post({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "invalid.scope",
      },
    });

    expect(status).toEqual(400);
    expect(data.error.message).toContain("Invalid scopes");
  });

  test("POST /oauth/authorize - fail with invalid client_id", async () => {
    const { status, data } = await http.post({
      path: "/oauth/authorize",
      body: {
        client_id: "invalid_client_id",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scope: "links.read",
      },
    });

    expect(status).toEqual(404);
  });
});

describe.sequential("OAuth - Scope Tests", async () => {
  const h = new IntegrationHarness();
  const { http, env } = await h.init();

  test("POST /oauth/authorize - default user.read scope is always included", async () => {
    const { data } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        scope: "links.read", // Only request links.read
      },
    });

    const callbackUrl = new URL(data.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    // Exchange code for token
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("code", code);
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    const tokenData = await response.json();

    // user.read should be automatically included
    expect(tokenData.scope).toContain("user.read");
    expect(tokenData.scope).toContain("links.read");
  });

  test("POST /oauth/authorize - multiple scopes with different separators", async () => {
    const { data } = await http.post<{ callbackUrl: string }>({
      path: "/oauth/authorize",
      body: {
        client_id: OAUTH_APP_SERVER_FLOW.clientId,
        redirect_uri: OAUTH_APP_SERVER_FLOW.redirectUri,
        response_type: "code",
        // Test space, comma, and plus separators
        scope: "links.read+links.write,analytics.read workspaces.read",
      },
    });

    const callbackUrl = new URL(data.callbackUrl);
    const code = callbackUrl.searchParams.get("code")!;

    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", OAUTH_APP_SERVER_FLOW.clientId);
    formData.append("client_secret", OAUTH_APP_SERVER_FLOW.clientSecret);
    formData.append("code", code);
    formData.append("redirect_uri", OAUTH_APP_SERVER_FLOW.redirectUri);

    const response = await fetch(`${env.E2E_BASE_URL}/api/oauth/token`, {
      method: "POST",
      body: formData,
    });

    const tokenData = await response.json();

    expect(tokenData.scope).toContain("links.read");
    expect(tokenData.scope).toContain("links.write");
    expect(tokenData.scope).toContain("analytics.read");
    expect(tokenData.scope).toContain("workspaces.read");
    expect(tokenData.scope).toContain("user.read");
  });
});
