import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

test("creates new link", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, apiKey, user, defaultDomains } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });
  
  const domain = defaultDomains[0];

  const { status, data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: { url: "https://google.com", domain },
  });

  expect(status).toEqual(200);
  expect(link).toMatchObject({
    id: expect.any(String),
    domain,
    key: expect.any(String),
    url: "https://google.com",
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
    shortLink: `${domain}/${link.key}`,
    qrCode: `https://api.dub.co/qr?url=${domain}/${link.key}`,
  });
});
