import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";

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
    ...expectedLink,
    domain,
    url,
    userId: user.id,
    projectId: workspace.id,
    workspaceId: workspace.workspaceId,
    shortLink: `https://${domain}/${link.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}`,
    tags: [],
  });
});
