import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

test("creates new link", async (ctx) => {
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

  const { status, data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: {
      url,
      domain,
    },
  });

  expect(status).toEqual(200);
  expect(link).toEqual({
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
    shortLink: `https://${domain}/${link.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}`,
  });
});
