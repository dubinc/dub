import { nanoid } from "@dub/utils";
import { Link, Tag } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain, url } = link;

describe("POST /links", async () => {
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

  test("default domain", async () => {
    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("user defined key", async () => {
    const key = nanoid(6);
    const comments = "This is a test";

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        key,
        comments,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      key,
      url,
      comments,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${key}?qr=1`,
      tags: [],
    });
  });

  test("prefix", async () => {
    const domain = "git.new";
    const prefix = "gh";

    const { status, data: link } = await http.post<
      Link & { shortLink: string }
    >({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        domain,
        prefix,
      },
    });

    expect(status).toEqual(200);
    expect(link.key.startsWith(prefix)).toBeTruthy();
    expect(link).toMatchObject({
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("utm builder", async (ctx) => {
    const longUrl = new URL(url);
    const utm = {
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: "summer",
      utm_term: "shoes",
      utm_content: "cta",
    };

    Object.keys(utm).forEach((key) => {
      longUrl.searchParams.set(key, utm[key]);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url: longUrl.href,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      ...utm,
      url: longUrl.href,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("password protection", async () => {
    const password = "link-password";

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        password,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      password,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("link expiration", async () => {
    const expiresAt = "Apr 16, 2030, 5:00 PM";
    const expiredUrl = "https://github.com/expired";

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        expiresAt,
        expiredUrl,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      expiresAt: "2030-04-16T11:30:00.000Z",
      expiredUrl,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("device targeting", async () => {
    const ios = "https://apps.apple.com/app/1611158928";
    const android =
      "https://play.google.com/store/apps/details?id=com.disney.disneyplus";

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        ios,
        android,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      ios,
      android,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("geo targeting", async () => {
    const geo = {
      AF: `${url}/AF`,
      AL: `${url}/AL`,
      DZ: `${url}/DZ`,
    };

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        geo,
      },
    });

    expect(status).toEqual(200);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      geo,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });
  });

  test("tags", async () => {
    const tagsToCreate = [
      { tag: "news", color: "red" },
      { tag: "work", color: "green" },
    ];

    const response = await Promise.all(
      tagsToCreate.map(({ tag, color }) =>
        http.post<Tag>({
          path: "/tags",
          query: { workspaceId },
          body: { tag, color },
        }),
      ),
    );

    const tagIds = response.map((r) => r.data.id);
    const tags = response.map((r) => {
      return {
        id: r.data.id,
        name: r.data.name,
        color: r.data.color,
      };
    });

    const { status, data: link } = await http.post<Link & { tags: [] }>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        tagIds,
      },
    });

    expect(status).toEqual(200);
    expect(link.tags).toHaveLength(2);
    expect(link).toMatchObject({
      ...expectedLink,
      url,
      tagId: expect.any(String), // TODO: Fix this
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: expect.arrayContaining(tags),
    });
  });
});
