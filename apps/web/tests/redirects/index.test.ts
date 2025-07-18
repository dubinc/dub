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

  test("with slash", async () => {
    const response = await fetch(`${h.baseUrl}/checkly/check`, fetchOptions);

    expect(response.headers.get("location")).toBe("https://www.checklyhq.com/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with dub_id", async () => {
    const response = await fetch(
      `${h.baseUrl}/conversion-tracking`,
      fetchOptions,
    );

    // the location should contain `?dub_id=` query param
    expect(response.headers.get("location")).toMatch(/dub_id=[a-zA-Z0-9]+/);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
  });

  test("with dub_id and via", async () => {
    const response = await fetch(`${h.baseUrl}/track-test`, fetchOptions);

    // the location should contain `?dub_id=` query param
    expect(response.headers.get("location")).toMatch(/dub_id=[a-zA-Z0-9]+/);
    // the location should contain `?via=track-test` query param
    expect(response.headers.get("location")).toMatch(/via=track-test/);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);
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

    expect(response.headers.get("location")).toBe("/?dub-no-track=1");
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
