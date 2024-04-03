import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

test("list links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  // Create a link
  const { data: firstLink } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: { url: "https://google.com" },
  });

  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create another link
  const { data: secondLink } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: { url: "https://google.uk" },
  });

  // List links
  const { data: links, status } = await http.get<Link[]>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
  });

  expect(status).toEqual(200);
  expect(links.length).toEqual(2);
  // expect(links[0]).toMatchObject({
  //   url: "https://google.uk",
  //   domain: "kiran.localhost",
  //   shortLink: `https://kiran.localhost/${firstLink.key}`,
  //   archived: false,
  //   // workspaceId: workspace.workspaceId,
  //   projectId: workspace.id,
  // });
  // expect(links[1]).toMatchObject({
  //   url: "https://google.com",
  //   domain: "kiran.localhost",
  //   shortLink: `https://kiran.localhost/${secondLink.key}`,
  //   archived: false,
  //   // workspaceId: workspace.workspaceId,
  //   projectId: workspace.id,
  // });
});
