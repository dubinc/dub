import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";

test("update an existing link", async (ctx) => {
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

  const { data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId: workspace.workspaceId },
    body: {
      url,
      domain,
    },
  });

  // Update the link
  const newLink = {
    key: nanoid(),
    url: "https://github.com/dubinc/dub",
    expiresAt: new Date("2030-01-01").toISOString(),
    title: "Dub Inc",
    description: "Open-source link management infrastructure.",
  };

  const { data: updatedLink } = await http.put<Link>({
    path: `/links/${link.id}`,
    query: { workspaceId: workspace.workspaceId },
    body: newLink,
  });

  expect(updatedLink).toEqual({
    ...expectedLink,
    ...newLink,
    domain,
    url: newLink.url,
    userId: user.id,
    projectId: workspace.id,
    workspaceId: workspace.workspaceId,
    shortLink: `https://${domain}/${newLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${newLink.key}?qr=1`,
    tags: [],
  });
});
