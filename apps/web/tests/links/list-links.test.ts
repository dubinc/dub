import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

test("list links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey, user } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  const domain = "dub.sh";
  const url = "https://github.com/dubinc";

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

  expect(links[0]).toMatchObject({
    id: expect.any(String),
    domain,
    url,
    key: expect.any(String),
    userId: user.id,
    projectId: workspace.id,
    workspaceId: workspace.workspaceId,
    archived: false,
    expiresAt: null,
    password: null,
    proxy: false,
    title: null,
    description: null,
    image: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    rewrite: false,
    ios: null,
    android: null,
    geo: null,
    publicStats: false,
    clicks: 0,
    lastClicked: null,
    checkDisabled: false,
    tagId: null,
    comments: null,
    tags: [],
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    shortLink: `https://${domain}/${secondLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${secondLink.key}`,
    user: JSON.parse(JSON.stringify(user)),
  });

  expect(links[1]).toMatchObject({
    id: expect.any(String),
    domain,
    url,
    key: expect.any(String),
    userId: user.id,
    projectId: workspace.id,
    workspaceId: workspace.workspaceId,
    archived: false,
    expiresAt: null,
    password: null,
    proxy: false,
    title: null,
    description: null,
    image: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    rewrite: false,
    ios: null,
    android: null,
    geo: null,
    publicStats: false,
    clicks: 0,
    lastClicked: null,
    checkDisabled: false,
    tagId: null,
    comments: null,
    tags: [],
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    shortLink: `https://${domain}/${firstLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink.key}`,
    user: JSON.parse(JSON.stringify(user)),
  });
});
