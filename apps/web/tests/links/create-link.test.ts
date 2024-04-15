import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";

const domain = "dub.sh";

describe("create links with", async () => {
  const h = new IntegrationHarness();
  const { workspace, apiKey, user } = await h.init();

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  afterAll(async () => {
    await h.teardown();
  });

  test("default domain", async (ctx) => {
    const url = "https://github.com/dubinc";

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId: workspace.workspaceId },
      body: {
        url,
      },
    });

    expect(status).toEqual(200);
    expect(link).toEqual({
      ...expectedLink,
      url,
      userId: user.id,
      projectId: workspace.id,
      workspaceId: workspace.workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("user defined key", async () => {
    const url = "https://github.com/dubinc";
    const key = nanoid(6);

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId: workspace.workspaceId },
      body: {
        url,
        key,
      },
    });

    expect(status).toEqual(200);
    expect(link).toEqual({
      ...expectedLink,
      key,
      url,
      userId: user.id,
      projectId: workspace.id,
      workspaceId: workspace.workspaceId,
      shortLink: `https://${domain}/${key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${key}?qr=1`,
      tags: [],
    });
  });

  test("utm builder", async (ctx) => {
    const url = "https://github.com/dubinc";

    const utm = {
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: "summer",
      utm_term: "shoes",
      utm_content: "cta",
    };

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId: workspace.workspaceId },
      body: {
        url,
        ...utm,
      },
    });

    console.log(link);

    expect(status).toEqual(200);
    expect(link).toEqual({
      ...expectedLink,
      ...utm,
      url,
      userId: user.id,
      projectId: workspace.id,
      workspaceId: workspace.workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });
});
