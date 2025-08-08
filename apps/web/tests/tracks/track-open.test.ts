import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK, E2E_TRACK_CLICK_HEADERS } from "../utils/resource";

// Helper function to verify click tracking response
const expectValidClickResponse = ({
  response,
}: {
  response: { status: number; data: any };
}) => {
  expect(response.status).toEqual(200);
  expect(response.data).toStrictEqual({
    clickId: expect.any(String),
    link: {
      id: expect.any(String),
      domain: E2E_LINK.domain,
      key: E2E_LINK.key,
      url: expect.any(String),
    },
  });
};

const deepLink = `https://${E2E_LINK.domain}/${E2E_LINK.key}`;

describe("POST /track/open", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("track a basic open", async () => {
    const response = await http.post<{ clickId: string }>({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink,
      },
    });

    expectValidClickResponse({
      response,
    });
  });

  test("same clickId should be returned on subsequent requests", async () => {
    const response1 = await http.post<{ clickId: string }>({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink,
      },
    });

    const response2 = await http.post<{ clickId: string }>({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink,
      },
    });

    expect(response1.data.clickId).toEqual(response2.data.clickId);
  });

  test("non-existent link should return not found error", async () => {
    const response = await http.post({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink: `https://${E2E_LINK.domain}/non-existent-key`,
      },
    });

    expect(response.status).toEqual(404);
    expect(response.data).toStrictEqual({
      error: {
        code: "not_found",
        message: `Deep link not found: https://${E2E_LINK.domain}/non-existent-key`,
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    });
  });

  test("OPTIONS request should return CORS headers", async () => {
    const response = await fetch(`${h.baseUrl}/api/track/open`, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toEqual(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type, Authorization",
    );
  });

  test("POST request should return CORS headers", async () => {
    const response = await http.post<{ clickId: string }>({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink,
      },
    });

    expect(response.status).toEqual(200);
  });

  test("clickId should be a valid string", async () => {
    const response = await http.post<{ clickId: string }>({
      path: "/track/open",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        deepLink,
      },
    });

    expect(response.data.clickId).toMatch(/^[a-zA-Z0-9]{16}$/);
  });
});
