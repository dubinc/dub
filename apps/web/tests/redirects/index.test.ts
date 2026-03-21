import { REDIRECTION_QUERY_PARAM } from "@dub/utils/src/constants";
import { describe, expect, test } from "vitest";
import { env } from "../utils/env";
import { IntegrationHarness } from "../utils/integration";

const poweredBy = "Dub - The Modern Link Attribution Platform";
const fetchOptions: RequestInit = {
  cache: "no-store",
  redirect: "manual",
  headers: {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  },
};

// Redirect includes ?dub_id=… and sets a matching dub_id_*_<linkKey> cookie whose value equals the query dub_id
async function assertRedirectWithDubIdCookie(
  baseUrl: string,
  linkKey: string,
  options?: { via?: string },
) {
  const response = await fetch(`${baseUrl}/${linkKey}`, fetchOptions);

  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  const redirectUrl = new URL(location!, baseUrl);
  const dubIdFromQuery = redirectUrl.searchParams.get("dub_id");
  expect(dubIdFromQuery).toBeTruthy();
  expect(dubIdFromQuery).toMatch(/^[a-zA-Z0-9_-]+$/);

  if (options?.via != null) {
    expect(redirectUrl.searchParams.get("via")).toBe(options.via);
  }

  expect(response.headers.get("x-powered-by")).toBe(poweredBy);
  expect(response.status).toBe(302);

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const dubIdCookie = setCookie.find((line) => {
    const name = line.split(";")[0]!.split("=")[0]!.trim();
    return name.startsWith("dub_id_") && name.endsWith(`_${linkKey}`);
  });
  expect(
    dubIdCookie,
    "expected Set-Cookie from createResponseWithCookies (dub_id_<domain>_<key>)",
  ).toBeDefined();

  const pair = dubIdCookie!.split(";")[0]!;
  const eq = pair.indexOf("=");
  const cookieValue = pair.slice(eq + 1);
  expect(cookieValue).toBe(dubIdFromQuery);

  const pathAttr = `/${encodeURI(linkKey)}`;
  expect(dubIdCookie).toMatch(
    new RegExp(
      `Path=${pathAttr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:;|$)`,
      "i",
    ),
  );
  expect(dubIdCookie).toMatch(/Max-Age=3600\b/i);

  console.log(`dubIdFromQuery: ${dubIdFromQuery}`);
  console.log(`dubIdFromCookie: ${cookieValue}`);
  console.log(`cookiePathAttr: ${pathAttr}`);
}

describe.runIf(env.CI)("Link Redirects", async () => {
  const h = new IntegrationHarness();

  test("root", async () => {
    const response = await fetch(h.baseUrl, fetchOptions);

    // the location should start with "https://dub.co"
    expect(response.headers.get("location")).toMatch(/^https:\/\/dub\.co\//);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(301);
  });

  test("regular", async () => {
    const response = await fetch(`${h.baseUrl}/checkly-check`, fetchOptions);

    expect(response.headers.get("location")).toBe("https://www.checklyhq.com/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("disabled link", async () => {
    const response = await fetch(`${h.baseUrl}/disabled`, fetchOptions);

    expect(response.headers.get("location")).toBe("https://dub.co/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with slash", async () => {
    const response = await fetch(`${h.baseUrl}/checkly/check`, fetchOptions);

    expect(response.headers.get("location")).toBe("https://www.checklyhq.com/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("korean unicode key", async () => {
    const hangulKey = "한글링크테스트";
    const url = new URL(h.baseUrl);
    url.pathname = `/${hangulKey}`;

    const response = await fetch(url.href, fetchOptions);

    expect(response.headers.get("location")).toBe(
      "https://youtu.be/9bZkp7q19f0",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("hebrew unicode key", async () => {
    const hebrewKey = "שלום";
    const url = new URL(h.baseUrl);
    url.pathname = `/${hebrewKey}`;

    const response = await fetch(url.href, fetchOptions);

    expect(response.headers.get("location")).toBe(
      "https://youtube.com/shorts/IdP2WdnJK1o",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with dub_id", async () => {
    await assertRedirectWithDubIdCookie(h.baseUrl, "conversion-tracking");
  });

  test("with dub_id (and slash in key)", async () => {
    await assertRedirectWithDubIdCookie(h.baseUrl, "conversion/tracking");
  });

  test("with dub_id and via", async () => {
    await assertRedirectWithDubIdCookie(h.baseUrl, "track-test", {
      via: "track-test",
    });
  });

  test("with dub_client_reference_id", async () => {
    const response = await fetch(
      `${h.baseUrl}/client_reference_id`,
      fetchOptions,
    );

    // the location should contain `?client_reference_id=dub_id_` query param
    expect(response.headers.get("location")).toMatch(
      /client_reference_id=dub_id_[a-zA-Z0-9]+/,
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with passthrough query", async () => {
    const response = await fetch(
      `${h.baseUrl}/checkly-check-passthrough?utm_source=checkly`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe(
      "https://www.checklyhq.com/?utm_source=checkly&utm_medium=social&utm_campaign=checks",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with complex query", async () => {
    const response = await fetch(
      `${h.baseUrl}/checkly-check-query`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe(
      "https://guides.apple.com/?ug=CglEVUIgR3VpZGUSDgjZMhDEo%2BGA%2BZKqpJUBEg4I2TIQw7y33%2B%2B6ifL%2BARIOCNkyEJC988jqgIrQjQESDgjZMhCB%2B7XSiPTwrfUBEg4I2TIQ5J25xZOynPDxARINCNkyENuVr4POz8aMcBIOCMI7EK36pfjQuerJ0gESDQjCOxDSuurnjM6T7mASDQjCOxD3vr%2F%2Fkq%2FLqUwSDQjCOxCg9cK%2BjeOhnS4%3D",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("singular tracking url", async () => {
    const response = await fetch(`${h.baseUrl}/singular`, fetchOptions);

    // location to include  cl, ua, ip query params
    expect(response.headers.get("location")).toMatch(/cl=[a-zA-Z0-9]+/);
    expect(response.headers.get("location")).toMatch(/ua=[a-zA-Z0-9]+/);
    expect(response.headers.get("location")).toMatch(/ip=[a-zA-Z0-9]+/);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("singular polyfill wpcn & wpcl params", async () => {
    const response = await fetch(
      `${h.baseUrl}/singular-polyfill`,
      fetchOptions,
    );

    const location = response.headers.get("location");
    expect(location).toBeTruthy();

    const url = new URL(location!);

    // wpcn should be replaced from {via} template to actual via value
    expect(url.searchParams.get("wpcn")).toBe("singular-polyfill");

    // wpcl should be replaced from {dub_id} template to actual dub_id value
    expect(url.searchParams.get("wpcl")).toMatch(/^[a-zA-Z0-9]+$/);

    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("google play store url", async () => {
    const response = await fetch(`${h.baseUrl}/gps`, fetchOptions);
    const location = response.headers.get("location");

    expect(response.status).toBe(302);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(location).toBeTruthy();

    const url = new URL(location!);
    const referrerEncoded = url.searchParams.get("referrer");
    expect(referrerEncoded).toBeTruthy();

    const referrer = decodeURIComponent(referrerEncoded!);
    const params = new URLSearchParams(referrer);

    expect(params.get("deepLink")).toBe("https://dub.sh/gps");
  });

  test("google play store url with existing referrer", async () => {
    const response = await fetch(
      `${h.baseUrl}/gps-with-referrer`,
      fetchOptions,
    );
    const location = response.headers.get("location");

    expect(response.status).toBe(302);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(location).toBeTruthy();

    const url = new URL(location!);
    const referrerEncoded = url.searchParams.get("referrer");
    expect(referrerEncoded).toBeTruthy();

    const referrer = decodeURIComponent(referrerEncoded!);
    const params = new URLSearchParams(referrer);

    expect(params.get("utm_source")).toBe("google");
    expect(params.get("deepLink")).toBe("https://dub.sh/gps-with-referrer");
  });

  test("query params with no value", async () => {
    const response = await fetch(
      `${h.baseUrl}/query-params-no-value`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe(
      "https://dub.co/blog?emptyquery",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with case-sensitive (correct) key", async () => {
    const response = await fetch(
      `${h.baseUrl}/cAsE-sensitive-test`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe(
      "https://dub.co/changelog/case-insensitive-links",
    );
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with case-sensitive (incorrect) key", async () => {
    const response = await fetch(
      `${h.baseUrl}/case-sensitive-test`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe("https://dub.co/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with case-sensitive key (and dub_id)", async () => {
    await assertRedirectWithDubIdCookie(h.baseUrl, "cAsE-sensitive-TeSt");
  });

  test("with password", async () => {
    const response = await fetch(
      `${h.baseUrl}/password/check?pw=dub`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe("https://dub.co/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("unsupported key", async () => {
    const response = await fetch(`${h.baseUrl}/wp-admin.php`, fetchOptions);

    expect(response.headers.get("location")).toMatch(/\/\?dub-no-track=1$/);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("redirection url", async () => {
    const response = await fetch(
      `${h.baseUrl}/redir-url-test?${REDIRECTION_QUERY_PARAM}=https://dub.co/blog`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe("https://dub.co/blog");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });
});
