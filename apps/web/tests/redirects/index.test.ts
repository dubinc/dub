import { Link } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const poweredBy = "Dub.co - Link management for modern marketing teams";
const domain = "dub.sh";
const fetchOptions: RequestInit = {
  cache: "no-store",
  redirect: "manual",
  headers: {
    "dub-no-track": "true",
  },
};

type LinkWithShortLink = Link & { shortLink: string };

describe.sequential("Link Redirects", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  test("root", async () => {
    const response = await fetch("https://dub.sh/", fetchOptions);

    expect(response.headers.get("location")).toBe("https://dub.co/");
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(301);
  });

  test("regular", async () => {
    const url = "https://www.checklyhq.com/";

    const { data: link } = await http.post<LinkWithShortLink>({
      path: "/links",
      query: { workspaceId },
      body: {
        domain,
        url,
      },
    });

    const response = await fetch(`${h.baseUrl}/${link.key}`, fetchOptions);

    expect(response.headers.get("location")).toBe(url);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);

    await h.deleteLink(link.id);
  });

  test("with slash", async () => {
    const url = "https://www.checklyhq.com/";

    const { data: link } = await http.post<LinkWithShortLink>({
      path: "/links",
      query: { workspaceId },
      body: {
        domain,
        url,
        prefix: "check",
      },
    });

    const response = await fetch(`${h.baseUrl}/${link.key}`, fetchOptions);

    expect(response.headers.get("location")).toBe(url);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);

    await h.deleteLink(link.id);
  });

  test("with passthrough query", async () => {
    const url =
      "https://www.checklyhq.com/?utm_source=checkly&utm_medium=social&utm_campaign=checks";

    const { data: link } = await http.post<LinkWithShortLink>({
      path: "/links",
      query: { workspaceId },
      body: {
        domain,
        url,
      },
    });

    const response = await fetch(`${h.baseUrl}/${link.key}`, fetchOptions);

    expect(response.headers.get("location")).toBe(url);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);

    await h.deleteLink(link.id);
  });

  test("with complex query", async () => {
    const url =
      "https://guides.apple.com/?ug=CglEVUIgR3VpZGUSDgjZMhDEo%2BGA%2BZKqpJUBEg4I2TIQw7y33%2B%2B6ifL%2BARIOCNkyEJC988jqgIrQjQESDgjZMhCB%2B7XSiPTwrfUBEg4I2TIQ5J25xZOynPDxARINCNkyENuVr4POz8aMcBIOCMI7EK36pfjQuerJ0gESDQjCOxDSuurnjM6T7mASDQjCOxD3vr%2F%2Fkq%2FLqUwSDQjCOxCg9cK%2BjeOhnS4%3D";

    const { data: link } = await http.post<LinkWithShortLink>({
      path: "/links",
      query: { workspaceId },
      body: {
        domain,
        url,
      },
    });

    const response = await fetch(`${h.baseUrl}/${link.key}`, fetchOptions);

    expect(response.headers.get("location")).toBe(url);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);

    await h.deleteLink(link.id);
  });

  test("with password", async () => {
    const url = "https://www.checklyhq.com/";

    const { data: link } = await http.post<LinkWithShortLink>({
      path: "/links",
      query: { workspaceId },
      body: {
        domain,
        url,
        password: "dub",
      },
    });

    const response = await fetch(
      `${h.baseUrl}/${link.key}?pw=dub`,
      fetchOptions,
    );

    expect(response.headers.get("location")).toBe(url);
    expect(response.headers.get("x-powered-by")).toBe(poweredBy);
    expect(response.status).toBe(302);

    await h.deleteLink(link.id);
  });
});
