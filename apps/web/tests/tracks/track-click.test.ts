import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK, E2E_TRACK_CLICK_HEADERS } from "../utils/resource";

// Helper function to verify click tracking response
const expectValidClickResponse = ({
  response,
  hasPartner = false,
  hasDiscount = false,
}: {
  response: { status: number; data: any };
  hasPartner?: boolean;
  hasDiscount?: boolean;
}) => {
  expect(response.status).toEqual(200);
  expect(response.data).toStrictEqual({
    clickId: expect.any(String),
    ...(hasPartner && {
      partner: expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        image: expect.any(String),
      }),
    }),
    ...(hasDiscount && {
      discount: expect.objectContaining({
        id: expect.any(String),
        amount: expect.any(Number),
        type: expect.any(String),
        maxDuration: expect.any(Number),
        couponId: expect.any(String),
        couponTestId: expect.any(String),
      }),
    }),
  });
};

describe("POST /track/click", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("track a basic click", async () => {
    const response = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: E2E_LINK.key,
      },
    });

    expectValidClickResponse({
      response,
    });
  });

  test("same clickId should be returned on subsequent requests", async () => {
    const response1 = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: E2E_LINK.key,
      },
    });

    const response2 = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: E2E_LINK.key,
      },
    });

    expect(response1.data.clickId).toEqual(response2.data.clickId);
  });

  test("partner link should return partner data", async () => {
    const clickResponse = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: "getacme.link",
        key: "derek",
      },
    });

    expect(clickResponse.status).toEqual(200);
    expectValidClickResponse({
      response: clickResponse,
      hasPartner: true,
      hasDiscount: true,
    });
  });

  test("missing domain should return validation error", async () => {
    const response = await http.post({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        key: E2E_LINK.key,
      },
    });

    expect(response.status).toEqual(422);
    expect(response.data).toStrictEqual({
      error: {
        code: "unprocessable_entity",
        message: "invalid_type: domain: domain is required.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("missing key should return validation error", async () => {
    const response = await http.post({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
      },
    });

    expect(response.status).toEqual(422);
    expect(response.data).toStrictEqual({
      error: {
        code: "unprocessable_entity",
        message: "invalid_type: key: key is required.",
        doc_url:
          "https://dub.co/docs/api-reference/errors#unprocessable-entity",
      },
    });
  });

  test("non-existent link should return not found error", async () => {
    const response = await http.post({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: "non-existent-key",
      },
    });

    expect(response.status).toEqual(404);
    expect(response.data).toStrictEqual({
      error: {
        code: "not_found",
        message: `Link not found for domain: ${E2E_LINK.domain} and key: non-existent-key.`,
        doc_url: "https://dub.co/docs/api-reference/errors#not-found",
      },
    });
  });

  // TODO: add this back when we have a way to return error even when clickId is cached
  //   test("Request origin not part of the allowed hostnames list should return forbidden error", async () => {
  //     const response = await http.post({
  //       path: "/track/click",
  //       headers: {
  //         ...E2E_TRACK_CLICK_HEADERS,
  //         referer: "https://not-allowed.com",
  //       },
  //       body: {
  //         domain: E2E_LINK.domain,
  //         key: E2E_LINK.key,
  //       },
  //     });

  //     expect(response.status).toEqual(403);
  //     expect(response.data).toStrictEqual({
  //       error: {
  //         code: "forbidden",
  //         message: `Request origin 'not-allowed.com' is not included in the allowed hostnames for this workspace (${E2E_LINK.domain}). Update your allowed hostnames here: https://app.dub.co/settings/analytics`,
  //         doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
  //       },
  //     });
  //   });

  test("OPTIONS request should return CORS headers", async () => {
    const response = await fetch(`${h.baseUrl}/api/track/click`, {
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
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: E2E_LINK.key,
      },
    });

    expect(response.status).toEqual(200);
  });

  test("clickId should be a valid string", async () => {
    const response = await http.post<{ clickId: string }>({
      path: "/track/click",
      headers: E2E_TRACK_CLICK_HEADERS,
      body: {
        domain: E2E_LINK.domain,
        key: E2E_LINK.key,
      },
    });

    expect(response.data.clickId).toMatch(/^[a-zA-Z0-9]{16}$/);
  });
});
