import { nanoid } from "@dub/utils";
import { Link, Tag } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";

describe("GET /analytics/**", async () => {
  const h = new IntegrationHarness();
  const { workspace, apiKey, user } = await h.init();
  const { workspaceId, id: projectId } = workspace;

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  afterAll(async () => {
    await h.teardown();
  });

  const domain = process.env.VERCEL === "1" ? "dub.sh" : "dub.localhost:8888";

 

  beforeAll(async () => {
    const { data: link } = await http.post<{ shortLink: string }>({
      path: "/links",
      query: { workspaceId },
      body: {
        url: "https://www.google.com",
        // domain
      },
    });

    console.log("domain", domain);
    console.log("link", link);

    // Visit the short link
    const response = await fetch("https://dub.sh/c/Cb95Vh5", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    });

    // const data = await response.text();
    // console.log("data", data);
    // console.log("link", link.shortLink);
  });

  test("GET /analytics/clicks", async () => {
    const { data: clicks } = await http.get<number>({
      path: "/analytics/clicks",
      query: { workspaceId },
    });

    expect(clicks).toBe(1);
  });
});
