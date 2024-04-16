import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";
import { link } from "../utils/resource";

const { domain, url } = link;

test("list links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey, user } = await h.init();

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
    body: { url, domain },
  });

  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create another link
  const { data: secondLink } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: { url, domain },
  });

  // List links
  const { data: links, status } = await http.get<Link[]>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
  });

  expect(status).toEqual(200);
  expect(links.length).toEqual(2);
  expect(links).toEqual([
    {
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId: workspace.id,
      workspaceId: workspace.workspaceId,
      tags: [],
      shortLink: `https://${domain}/${secondLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${secondLink.key}?qr=1`,
      user: JSON.parse(JSON.stringify(user)),
    },
    {
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId: workspace.id,
      workspaceId: workspace.workspaceId,
      tags: [],
      shortLink: `https://${domain}/${firstLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink.key}?qr=1`,
      user: JSON.parse(JSON.stringify(user)),
    },
  ]);
});
